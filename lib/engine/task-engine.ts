import { EventType, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logEvent } from "@/lib/engine/events";

export interface TaskStateResult {
  taskId: string;
  previousStatus: TaskStatus;
  newStatus: TaskStatus;
  unlocked: boolean;
}

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  LOCKED: [TaskStatus.AVAILABLE],
  AVAILABLE: [TaskStatus.SUBMITTED, TaskStatus.EXPIRED],
  SUBMITTED: [TaskStatus.PENDING_REVIEW, TaskStatus.EXPIRED],
  PENDING_REVIEW: [TaskStatus.APPROVED, TaskStatus.REJECTED],
  APPROVED: [TaskStatus.REWARDED, TaskStatus.EXPIRED],
  REJECTED: [TaskStatus.AVAILABLE],
  REWARDED: [TaskStatus.EXPIRED],
  EXPIRED: [],
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export async function unlockFirstTask(campaignId: string): Promise<TaskStateResult | null> {
  const firstTask = await prisma.campaignTask.findFirst({
    where: { campaignId, status: TaskStatus.LOCKED },
    orderBy: { sortOrder: "asc" },
  });
  if (!firstTask) return null;

  return transitionTask(firstTask.id, TaskStatus.AVAILABLE, { campaignId });
}

export async function unlockNextTask(
  currentTaskId: string
): Promise<TaskStateResult | null> {
  const currentTask = await prisma.campaignTask.findUnique({
    where: { id: currentTaskId },
  });
  if (!currentTask) return null;

  const nextTask = await prisma.campaignTask.findFirst({
    where: {
      campaignId: currentTask.campaignId,
      sortOrder: { gt: currentTask.sortOrder },
      status: TaskStatus.LOCKED,
    },
    orderBy: { sortOrder: "asc" },
  });
  if (!nextTask) return null;

  return transitionTask(nextTask.id, TaskStatus.AVAILABLE, {
    campaignId: currentTask.campaignId,
  });
}

export async function transitionTask(
  taskId: string,
  newStatus: TaskStatus,
  context: { campaignId?: string; userId?: string; participationId?: string }
): Promise<TaskStateResult> {
  const task = await prisma.campaignTask.findUnique({ where: { id: taskId } });
  if (!task) throw new Error(`Task ${taskId} not found`);

  const previousStatus = task.status as TaskStatus;
  if (previousStatus === newStatus) {
    return { taskId, previousStatus, newStatus, unlocked: false };
  }

  if (!canTransition(previousStatus, newStatus)) {
    throw new Error(
      `Invalid transition: ${previousStatus} → ${newStatus} for task ${taskId}`
    );
  }

  const updated = await prisma.campaignTask.update({
    where: { id: taskId },
    data: { status: newStatus },
  });

  // Log event
  const eventTypeMap: Partial<Record<TaskStatus, EventType>> = {
    AVAILABLE: EventType.task_start,
    SUBMITTED: EventType.task_submit,
    APPROVED: EventType.review_approved,
    REJECTED: EventType.review_rejected,
  };
  const eventType = eventTypeMap[newStatus];
  if (eventType) {
    await logEvent({
      eventType,
      userId: context.userId,
      campaignId: context.campaignId ?? task.campaignId,
      metadata: { taskId, previousStatus, newStatus, participationId: context.participationId },
    });
  }

  // Unlock next task on approval
  let nextTaskUnlocked = false;
  if (newStatus === TaskStatus.APPROVED) {
    const nextResult = await unlockNextTask(taskId);
    nextTaskUnlocked = nextResult !== null;
  }

  return {
    taskId,
    previousStatus,
    newStatus: updated.status as TaskStatus,
    unlocked: nextTaskUnlocked,
  };
}

export async function approveTask(submissionId: string, reviewerId?: string): Promise<TaskStateResult> {
  const submission = await prisma.taskSubmission.findUnique({
    where: { id: submissionId },
    include: { task: true },
  });
  if (!submission) throw new Error(`Submission ${submissionId} not found`);

  await prisma.taskSubmission.update({
    where: { id: submissionId },
    data: {
      status: TaskStatus.APPROVED,
      reviewedAt: new Date(),
      reviewedBy: reviewerId ?? null,
    },
  });

  return transitionTask(submission.taskId, TaskStatus.APPROVED, {
    campaignId: submission.task.campaignId,
    userId: submission.userId,
    participationId: submission.participationId ?? undefined,
  });
}

export async function rejectTask(
  submissionId: string,
  reviewNote: string,
  reviewerId?: string
): Promise<TaskStateResult> {
  const submission = await prisma.taskSubmission.findUnique({
    where: { id: submissionId },
    include: { task: true },
  });
  if (!submission) throw new Error(`Submission ${submissionId} not found`);

  await prisma.taskSubmission.update({
    where: { id: submissionId },
    data: {
      status: TaskStatus.REJECTED,
      reviewNote,
      reviewedAt: new Date(),
      reviewedBy: reviewerId ?? null,
    },
  });

  return transitionTask(submission.taskId, TaskStatus.REJECTED, {
    campaignId: submission.task.campaignId,
    userId: submission.userId,
    participationId: submission.participationId ?? undefined,
  });
}
