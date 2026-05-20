import { EventType, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logEvent } from "@/lib/engine/events";

export interface TaskStateResult {
  taskId: string;
  previousStatus: TaskStatus;
  newStatus: TaskStatus;
  nextTaskUnlocked: boolean;
}

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  LOCKED: [TaskStatus.AVAILABLE],
  AVAILABLE: [
    TaskStatus.SUBMITTED,
    TaskStatus.PENDING_REVIEW,
    TaskStatus.APPROVED,
    TaskStatus.REJECTED,
    TaskStatus.EXPIRED,
  ],
  SUBMITTED: [
    TaskStatus.PENDING_REVIEW,
    TaskStatus.APPROVED,
    TaskStatus.REJECTED,
    TaskStatus.EXPIRED,
  ],
  PENDING_REVIEW: [TaskStatus.APPROVED, TaskStatus.REJECTED],
  APPROVED: [TaskStatus.REWARDED, TaskStatus.EXPIRED],
  REJECTED: [
    TaskStatus.AVAILABLE,
    TaskStatus.SUBMITTED,
    TaskStatus.PENDING_REVIEW,
    TaskStatus.APPROVED,
  ],
  REWARDED: [TaskStatus.EXPIRED],
  EXPIRED: [],
};

const EVENT_FOR_STATUS: Partial<Record<TaskStatus, EventType>> = {
  AVAILABLE: EventType.task_start,
  SUBMITTED: EventType.task_submit,
  APPROVED: EventType.review_approved,
  REJECTED: EventType.review_rejected,
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── Core: atomic task transition with Prisma transaction ───────

export async function transitionTask(
  taskId: string,
  newStatus: TaskStatus,
  context: { campaignId?: string; userId?: string; participationId?: string; reviewNote?: string }
): Promise<TaskStateResult> {
  return prisma.$transaction(async (tx) => {
    const task = await tx.campaignTask.findUnique({ where: { id: taskId } });
    if (!task) throw new Error(`Task ${taskId} not found`);

    const previousStatus = task.status as TaskStatus;
    if (previousStatus === newStatus) {
      return { taskId, previousStatus, newStatus, nextTaskUnlocked: false };
    }

    if (!canTransition(previousStatus, newStatus)) {
      throw new Error(`Invalid transition: ${previousStatus} → ${newStatus} for task ${taskId}`);
    }

    await tx.campaignTask.update({
      where: { id: taskId },
      data: { status: newStatus },
    });

    // Unlock next task on approval
    let nextTaskUnlocked = false;
    if (newStatus === TaskStatus.APPROVED) {
      const nextTask = await tx.campaignTask.findFirst({
        where: {
          campaignId: task.campaignId,
          sortOrder: { gt: task.sortOrder },
          status: TaskStatus.LOCKED,
        },
        orderBy: { sortOrder: "asc" },
      });
      if (nextTask) {
        await tx.campaignTask.update({
          where: { id: nextTask.id },
          data: { status: TaskStatus.AVAILABLE },
        });
        nextTaskUnlocked = true;

        // Log event for unlocked task
        await tx.event.create({
          data: {
            eventType: EventType.task_start,
            userId: context.userId ?? null,
            campaignId: context.campaignId ?? task.campaignId,
            metadata: {
              taskId: nextTask.id,
              previousStatus: "LOCKED",
              newStatus: "AVAILABLE",
              participationId: context.participationId,
              triggeredBy: taskId,
            },
          },
        });
      }

      // Update participation.currentTask
      if (context.participationId) {
        const approved = await tx.taskSubmission.count({
          where: {
            participationId: context.participationId,
            status: "APPROVED",
          },
        });
        await tx.participation.update({
          where: { id: context.participationId },
          data: { currentTask: task.sortOrder },
        });
      }
    }

    // Log event for this transition
    const eventType = EVENT_FOR_STATUS[newStatus];
    if (eventType) {
      await tx.event.create({
        data: {
          eventType,
          userId: context.userId ?? null,
          campaignId: context.campaignId ?? task.campaignId,
          metadata: {
            taskId,
            previousStatus,
            newStatus,
            participationId: context.participationId,
            ...(context.reviewNote ? { reviewNote: context.reviewNote } : {}),
          },
        },
      });
    }

    return { taskId, previousStatus, newStatus, nextTaskUnlocked };
  });
}

// ─── NFC tap → auto unlock first task ──────────────────────

export async function unlockByNFCTap(
  nfcCardId: string,
  openid: string,
  campaignId: string
): Promise<{
  participation: { id: string; openid: string; campaignId: string };
  firstTaskUnlocked: boolean;
  isNewParticipation: boolean;
  existingParticipations: number;
}> {
  // Count historical participations for this openid (before transaction)
  const existingCount = await prisma.participation.count({
    where: { openid },
  });

  return prisma.$transaction(async (tx) => {
    // Idempotent: find or create participation
    let participation = await tx.participation.findUnique({
      where: { openid_campaignId: { openid, campaignId } },
    });
    const isNewParticipation = !participation;
    if (isNewParticipation) {
      participation = await tx.participation.create({
        data: { openid, campaignId, currentTask: 0, status: "UNCLAIMED" },
      });
    }

    // Log NFC tap event with enhanced metadata
    await tx.event.create({
      data: {
        eventType: EventType.nfc_tap,
        nfcCardId,
        campaignId,
        metadata: {
          nfcCardId,
          openid,
          participationId: participation!.id,
          campaignId,
          isNewParticipation,
          existingParticipations: existingCount,
        },
      },
    });

    // Unlock first task if new participation
    let firstTaskUnlocked = false;
    if (isNewParticipation) {
      const firstTask = await tx.campaignTask.findFirst({
        where: { campaignId, status: TaskStatus.LOCKED },
        orderBy: { sortOrder: "asc" },
      });
      if (firstTask) {
        await tx.campaignTask.update({
          where: { id: firstTask.id },
          data: { status: TaskStatus.AVAILABLE },
        });
        firstTaskUnlocked = true;
      }
    }

    return { participation: participation!, firstTaskUnlocked, isNewParticipation, existingParticipations: existingCount };
  });
}

// ─── Approve / Reject ──────────────────────────────────────

export async function approveTask(
  submissionId: string,
  reviewerId?: string
): Promise<TaskStateResult> {
  return prisma.$transaction(async (tx) => {
    const submission = await tx.taskSubmission.findUnique({
      where: { id: submissionId },
      include: { task: true },
    });
    if (!submission) throw new Error(`Submission ${submissionId} not found`);
    if (submission.status === "APPROVED") {
      return {
        taskId: submission.taskId,
        previousStatus: "APPROVED" as TaskStatus,
        newStatus: "APPROVED" as TaskStatus,
        nextTaskUnlocked: false,
      };
    }

    await tx.taskSubmission.update({
      where: { id: submissionId },
      data: { status: TaskStatus.APPROVED, reviewedAt: new Date(), reviewedBy: reviewerId ?? null },
    });

    // Transition the campaign task → APPROVED (which auto-unlocks next)
    return transitionTask(submission.taskId, TaskStatus.APPROVED, {
      campaignId: submission.task.campaignId,
      userId: submission.userId,
      participationId: submission.participationId ?? undefined,
    });
  });
}

export async function rejectTask(
  submissionId: string,
  reviewNote: string,
  reviewerId?: string
): Promise<TaskStateResult> {
  return prisma.$transaction(async (tx) => {
    const submission = await tx.taskSubmission.findUnique({
      where: { id: submissionId },
      include: { task: true },
    });
    if (!submission) throw new Error(`Submission ${submissionId} not found`);

    await tx.taskSubmission.update({
      where: { id: submissionId },
      data: { status: TaskStatus.REJECTED, reviewNote, reviewedAt: new Date(), reviewedBy: reviewerId ?? null },
    });

    return transitionTask(submission.taskId, TaskStatus.REJECTED, {
      campaignId: submission.task.campaignId,
      userId: submission.userId,
      participationId: submission.participationId ?? undefined,
      reviewNote,
    });
  });
}

// ─── Backwards-compat aliases ──────────────────────────────

export async function unlockFirstTask(campaignId: string): Promise<TaskStateResult | null> {
  const firstTask = await prisma.campaignTask.findFirst({
    where: { campaignId, status: TaskStatus.LOCKED },
    orderBy: { sortOrder: "asc" },
  });
  if (!firstTask) return null;
  return transitionTask(firstTask.id, TaskStatus.AVAILABLE, { campaignId });
}

export async function unlockNextTask(currentTaskId: string): Promise<TaskStateResult | null> {
  const task = await prisma.campaignTask.findUnique({ where: { id: currentTaskId } });
  if (!task) return null;
  const next = await prisma.campaignTask.findFirst({
    where: {
      campaignId: task.campaignId,
      sortOrder: { gt: task.sortOrder },
      status: TaskStatus.LOCKED,
    },
    orderBy: { sortOrder: "asc" },
  });
  if (!next) return null;
  return transitionTask(next.id, TaskStatus.AVAILABLE, { campaignId: task.campaignId });
}

// ─── Bulk state queries ────────────────────────────────────

export async function getTaskStates(campaignId: string) {
  return prisma.campaignTask.findMany({
    where: { campaignId },
    orderBy: { sortOrder: "asc" },
    include: { reward: { select: { name: true } } },
  });
}

export async function getParticipationTaskStates(participationId: string) {
  const participation = await prisma.participation.findUnique({
    where: { id: participationId },
    include: {
      campaign: {
        include: {
          tasks: {
            orderBy: { sortOrder: "asc" },
            include: {
              reward: { select: { name: true, type: true } },
              submissions: {
                where: { participationId },
                orderBy: { submittedAt: "desc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });
  if (!participation) throw new Error("Participation not found");

  return {
    participationId: participation!.id,
    currentTask: participation.currentTask,
    campaignId: participation.campaignId,
    tasks: participation.campaign.tasks.map((t) => ({
      id: t.id,
      sortOrder: t.sortOrder,
      status: t.status as TaskStatus,
      title: t.title,
      rewardName: t.reward?.name ?? null,
      latestSubmission: t.submissions[0] ?? null,
    })),
  };
}
