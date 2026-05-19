import {
  ClaimStatus,
  EventType,
  MediaType,
  Prisma,
  TaskStatus,
  VerificationMethod,
  VerificationStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { HttpError } from "@/lib/api/errors";
import {
  createRedemptionWithUniqueCode,
  getOrCreateUserForOpenid,
  getParticipationOrThrow,
  resolveCampaignPublicId,
  serializeReward,
} from "@/lib/api/h5";
import { assertCampaignBelongsToMerchant } from "@/lib/api/merchant";
import { prisma } from "@/lib/prisma";

export type SprintApiBody<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string; details?: unknown };

export function sprintSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data, error: null } satisfies SprintApiBody<T>, { status });
}

export function sprintError(error: unknown) {
  if (error instanceof HttpError) {
    const body: SprintApiBody<null> = {
      success: false,
      data: null,
      error: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    };
    return NextResponse.json(body, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: "Invalid request body",
        details: error.flatten(),
      } satisfies SprintApiBody<null>,
      { status: 400 }
    );
  }

  console.error(error);
  return NextResponse.json(
    { success: false, data: null, error: "Internal server error" } satisfies SprintApiBody<null>,
    { status: 500 }
  );
}

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional()
);

export const mediaPayloadSchema = z.object({
  id: optionalText,
  url: z.string().trim().min(1),
  mediaType: z.nativeEnum(MediaType).default(MediaType.IMAGE),
  category: optionalText,
  platform: optionalText,
  dishName: optionalText,
  title: optionalText,
  tags: z.array(z.string().trim().min(1)).default([]),
  description: optionalText,
  allowUserUse: z.coerce.boolean().default(true),
  enabled: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
  step2Enabled: z.coerce.boolean().default(false),
  step3Enabled: z.coerce.boolean().default(false),
});

export const verificationPayloadSchema = z.object({
  taskSortOrder: z.coerce.number().int().min(1).max(3).default(2),
  platform: optionalText,
  link: optionalText,
  screenshotUrl: optionalText,
  content: optionalText,
});

export const staffConfirmPayloadSchema = verificationPayloadSchema.extend({
  taskSortOrder: z.coerce.number().int().min(1).max(3).default(2),
  note: optionalText,
});

export const qualityReviewPayloadSchema = z.object({
  verificationId: z.string().trim().min(1),
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: optionalText,
  qualityScore: z.coerce.number().int().min(0).max(100).optional(),
  qualityBreakdown: z.record(z.coerce.number().int().min(0).max(20)).optional(),
});

export const lotterySettingsSchema = z.object({
  lotteryDailyQuota: z.coerce.number().int().min(0).max(999),
  lotteryDrawTime: optionalText,
  lotteryMinScore: z.coerce.number().int().min(0).max(100),
  lotteryActive: z.coerce.boolean(),
});

export async function assertMerchantCampaign(campaignId: string, merchantId: string) {
  return assertCampaignBelongsToMerchant(campaignId, merchantId);
}

export async function resolveCampaignForMedia(id: string) {
  return resolveCampaignPublicId(id);
}

async function getStepTask(campaignId: string, sortOrder: number) {
  const task = await prisma.campaignTask.findFirst({
    where: { campaignId, sortOrder },
    include: { reward: true },
  });

  if (!task) {
    throw new HttpError(`Step ${sortOrder} task not found`, 404);
  }

  return task;
}

function chanceForScore(score: number | null | undefined) {
  if (score === undefined || score === null || score < 60) return 0;
  if (score < 80) return 1;
  return score >= 90 ? 3 : 2;
}

async function getOrCreateRewardRedemption(input: {
  participationId: string;
  rewardId: string | null | undefined;
}) {
  if (!input.rewardId) return null;

  const existing = await prisma.redemption.findFirst({
    where: {
      participationId: input.participationId,
      rewardId: input.rewardId,
    },
    include: { reward: true },
  });

  if (existing) return existing;

  return createRedemptionWithUniqueCode({
    participationId: input.participationId,
    rewardId: input.rewardId,
  });
}

export async function completeCheckIn(participationId: string) {
  const participation = await getParticipationOrThrow(participationId);
  const task = await getStepTask(participation.campaignId, 1);
  const user = await getOrCreateUserForOpenid(participation.openid);

  const submission = await prisma.taskSubmission.upsert({
    where: { userId_taskId: { userId: user.id, taskId: task.id } },
    create: {
      userId: user.id,
      taskId: task.id,
      participationId,
      content: "用户确认到店",
      status: TaskStatus.APPROVED,
      reviewedAt: new Date(),
    },
    update: {
      participationId,
      content: "用户确认到店",
      status: TaskStatus.APPROVED,
      reviewNote: null,
      reviewedAt: new Date(),
      submittedAt: new Date(),
    },
  });

  await prisma.participationVerification.upsert({
    where: { participationId_taskId: { participationId, taskId: task.id } },
    create: {
      participationId,
      taskId: task.id,
      submissionId: submission.id,
      method: VerificationMethod.STAFF_CONFIRM,
      status: VerificationStatus.APPROVED,
      verifiedAt: new Date(),
    },
    update: {
      submissionId: submission.id,
      method: VerificationMethod.STAFF_CONFIRM,
      status: VerificationStatus.APPROVED,
      verifiedAt: new Date(),
      reviewNote: null,
    },
  });

  const redemption = await getOrCreateRewardRedemption({
    participationId,
    rewardId: task.rewardId,
  });

  await prisma.participation.update({
    where: { id: participationId },
    data: { currentTask: { set: Math.max(participation.currentTask, 1) } },
  });

  await prisma.event.create({
    data: {
      eventType: EventType.review_approved,
      campaignId: participation.campaignId,
      userId: user.id,
      metadata: {
        participationId,
        taskId: task.id,
        step: 1,
        method: "CHECK_IN",
      } as Prisma.InputJsonObject,
    },
  });

  return {
    taskId: task.id,
    redemption: redemption
      ? {
          id: redemption.id,
          code: redemption.code,
          status: redemption.status,
          reward: serializeReward(redemption.reward),
        }
      : null,
    flowState: await getParticipationFlowState(participationId),
  };
}

export async function submitParticipationVerification(input: {
  participationId: string;
  taskSortOrder: number;
  method: VerificationMethod;
  platform?: string;
  link?: string;
  screenshotUrl?: string;
  content?: string;
  status?: VerificationStatus;
  reviewNote?: string;
  qualityScore?: number;
  qualityBreakdown?: Record<string, number>;
}) {
  const participation = await getParticipationOrThrow(input.participationId);
  const task = await getStepTask(participation.campaignId, input.taskSortOrder);
  const user = await getOrCreateUserForOpenid(participation.openid);
  const status = input.status ?? VerificationStatus.PENDING;
  const submissionStatus =
    status === VerificationStatus.APPROVED
      ? TaskStatus.APPROVED
      : status === VerificationStatus.REJECTED
        ? TaskStatus.REJECTED
        : TaskStatus.SUBMITTED;

  const submission = await prisma.taskSubmission.upsert({
    where: { userId_taskId: { userId: user.id, taskId: task.id } },
    create: {
      userId: user.id,
      taskId: task.id,
      participationId: input.participationId,
      content: input.content,
      imageUrls: input.screenshotUrl ? [input.screenshotUrl] : [],
      platformLink: input.link,
      status: submissionStatus,
      reviewNote: input.reviewNote,
      reviewedAt: status === VerificationStatus.PENDING ? null : new Date(),
    },
    update: {
      participationId: input.participationId,
      content: input.content,
      imageUrls: input.screenshotUrl ? [input.screenshotUrl] : [],
      platformLink: input.link,
      status: submissionStatus,
      reviewNote: input.reviewNote ?? null,
      reviewedAt: status === VerificationStatus.PENDING ? null : new Date(),
      submittedAt: new Date(),
    },
  });

  const lotteryChances = input.taskSortOrder === 3 ? chanceForScore(input.qualityScore) : 0;
  const verification = await prisma.participationVerification.upsert({
    where: { participationId_taskId: { participationId: input.participationId, taskId: task.id } },
    create: {
      participationId: input.participationId,
      taskId: task.id,
      submissionId: submission.id,
      method: input.method,
      platform: input.platform,
      link: input.link,
      screenshotUrl: input.screenshotUrl,
      status,
      verifiedAt: status === VerificationStatus.PENDING ? null : new Date(),
      reviewNote: input.reviewNote,
      qualityScore: input.qualityScore,
      qualityBreakdown: input.qualityBreakdown as Prisma.InputJsonObject | undefined,
      lotteryChances,
    },
    update: {
      submissionId: submission.id,
      method: input.method,
      platform: input.platform,
      link: input.link,
      screenshotUrl: input.screenshotUrl,
      status,
      verifiedAt: status === VerificationStatus.PENDING ? null : new Date(),
      reviewNote: input.reviewNote ?? null,
      qualityScore: input.qualityScore,
      qualityBreakdown: input.qualityBreakdown as Prisma.InputJsonObject | undefined,
      lotteryChances,
    },
    include: {
      participation: true,
      task: true,
      submission: true,
    },
  });

  if (status === VerificationStatus.APPROVED) {
    await prisma.participation.update({
      where: { id: input.participationId },
      data: { currentTask: Math.max(participation.currentTask, input.taskSortOrder) },
    });
    await getOrCreateRewardRedemption({
      participationId: input.participationId,
      rewardId: task.rewardId,
    });

    if (input.taskSortOrder === 3 && lotteryChances > 0) {
      await prisma.lotteryEntry.upsert({
        where: {
          campaignId_participationId: {
            campaignId: participation.campaignId,
            participationId: input.participationId,
          },
        },
        create: {
          campaignId: participation.campaignId,
          participationId: input.participationId,
          weight: lotteryChances,
          qualityScore: input.qualityScore,
        },
        update: {
          weight: lotteryChances,
          qualityScore: input.qualityScore,
          status: "PENDING",
        },
      });
    }
  }

  await prisma.event.create({
    data: {
      eventType:
        status === VerificationStatus.APPROVED
          ? EventType.review_approved
          : status === VerificationStatus.REJECTED
            ? EventType.review_rejected
            : EventType.task_submit,
      campaignId: participation.campaignId,
      userId: user.id,
      metadata: {
        participationId: input.participationId,
        verificationId: verification.id,
        taskId: task.id,
        step: input.taskSortOrder,
        method: input.method,
        reviewNote: input.reviewNote,
      } as Prisma.InputJsonObject,
    },
  });

  return {
    verification: serializeVerification(verification),
    flowState: await getParticipationFlowState(input.participationId),
  };
}

export async function reviewParticipationVerification(input: {
  verificationId: string;
  merchantId: string;
  status: VerificationStatus;
  reviewNote?: string;
  qualityScore?: number;
  qualityBreakdown?: Record<string, number>;
}) {
  const existing = await prisma.participationVerification.findUnique({
    where: { id: input.verificationId },
    include: {
      participation: { include: { campaign: { include: { store: true } } } },
      task: true,
      submission: true,
    },
  });

  if (!existing) throw new HttpError("Verification not found", 404);
  if (existing.participation.campaign.store.merchantId !== input.merchantId) {
    throw new HttpError("Forbidden", 403);
  }

  return submitParticipationVerification({
    participationId: existing.participationId,
    taskSortOrder: existing.task.sortOrder,
    method: existing.method,
    platform: existing.platform ?? undefined,
    link: existing.link ?? undefined,
    screenshotUrl: existing.screenshotUrl ?? undefined,
    content: existing.submission?.content ?? undefined,
    status: input.status,
    reviewNote: input.reviewNote,
    qualityScore: input.qualityScore ?? existing.qualityScore ?? undefined,
    qualityBreakdown: input.qualityBreakdown,
  });
}

export function serializeVerification(
  verification: Prisma.ParticipationVerificationGetPayload<{
    include?: {
      participation?: true;
      task?: true;
      submission?: true;
    };
  }>
) {
  return {
    id: verification.id,
    participationId: verification.participationId,
    taskId: verification.taskId,
    submissionId: verification.submissionId,
    method: verification.method,
    platform: verification.platform,
    link: verification.link,
    screenshotUrl: verification.screenshotUrl,
    status: verification.status,
    verifiedAt: verification.verifiedAt?.toISOString() ?? null,
    reviewNote: verification.reviewNote,
    qualityScore: verification.qualityScore,
    qualityBreakdown: verification.qualityBreakdown,
    lotteryChances: verification.lotteryChances,
    createdAt: verification.createdAt.toISOString(),
    updatedAt: verification.updatedAt.toISOString(),
  };
}

export function serializeMedia(
  media: Prisma.CampaignMediaGetPayload<Record<string, never>>
) {
  return {
    id: media.id,
    campaignId: media.campaignId,
    url: media.url,
    mediaType: media.mediaType,
    category: media.category,
    platform: media.platform,
    dishName: media.dishName,
    title: media.title,
    tags: media.tags,
    description: media.description,
    allowUserUse: media.allowUserUse,
    enabled: media.enabled,
    sortOrder: media.sortOrder,
    step2Enabled: media.step2Enabled,
    step3Enabled: media.step3Enabled,
    createdAt: media.createdAt.toISOString(),
    updatedAt: media.updatedAt.toISOString(),
  };
}

function localTaskId(sortOrder: number) {
  return `l${sortOrder}`;
}

function statusFromSubmission(input: {
  submission?: { status: TaskStatus } | null;
  verification?: { status: VerificationStatus } | null;
  previousApproved: boolean;
  sortOrder: number;
}) {
  if (input.submission?.status === TaskStatus.APPROVED || input.verification?.status === VerificationStatus.APPROVED) {
    return "APPROVED";
  }
  if (input.submission?.status === TaskStatus.REJECTED || input.verification?.status === VerificationStatus.REJECTED) {
    return "REJECTED";
  }
  if (input.submission || input.verification) return "SUBMITTED";
  if (input.sortOrder === 1 || input.previousApproved) return "AVAILABLE";
  return "LOCKED";
}

export async function getParticipationFlowState(participationId: string) {
  const participation = await prisma.participation.findUnique({
    where: { id: participationId },
    include: {
      campaign: {
        include: {
          store: { include: { merchant: true } },
          tasks: {
            orderBy: { sortOrder: "asc" },
            include: { reward: true },
          },
          rewards: true,
        },
      },
      submissions: {
        orderBy: { submittedAt: "desc" },
        include: { task: true },
      },
      redemptions: {
        include: { reward: true },
      },
      verifications: true,
      lotteryEntries: true,
    },
  });

  if (!participation) throw new HttpError("Participation not found", 404);

  const submissionsByTaskId = new Map<string, (typeof participation.submissions)[number]>();
  for (const submission of participation.submissions) {
    if (!submissionsByTaskId.has(submission.taskId)) {
      submissionsByTaskId.set(submission.taskId, submission);
    }
  }
  const verificationsByTaskId = new Map(participation.verifications.map((item) => [item.taskId, item]));
  const redemptionsByRewardId = new Map(participation.redemptions.map((item) => [item.rewardId, item]));

  let previousApproved = true;
  const tasks = participation.campaign.tasks.map((task) => {
    const submission = submissionsByTaskId.get(task.id) ?? null;
    const verification = verificationsByTaskId.get(task.id) ?? null;
    const status = statusFromSubmission({
      submission,
      verification,
      previousApproved,
      sortOrder: task.sortOrder,
    });

    if (status !== "APPROVED") previousApproved = false;

    return {
      id: localTaskId(task.sortOrder),
      apiTaskId: task.id,
      sortOrder: task.sortOrder,
      title: task.title,
      description: task.description,
      status,
      reward: task.reward ? serializeReward(task.reward) : null,
      submission: submission
        ? {
            id: submission.id,
            status: submission.status,
            platformLink: submission.platformLink,
            imageUrls: submission.imageUrls,
            reviewNote: submission.reviewNote,
            submittedAt: submission.submittedAt.toISOString(),
          }
        : null,
      verification: verification ? serializeVerification(verification) : null,
    };
  });

  const rewards = participation.campaign.rewards.map((reward) => {
    const linkedTask = participation.campaign.tasks.find((task) => task.rewardId === reward.id) ?? null;
    const taskState = linkedTask ? tasks.find((task) => task.apiTaskId === linkedTask.id) : null;
    const redemption = redemptionsByRewardId.get(reward.id) ?? null;
    const category =
      redemption?.status === ClaimStatus.USED
        ? "used"
        : redemption?.status === ClaimStatus.EXPIRED
          ? "expired"
          : redemption
            ? "available"
            : taskState?.status === "SUBMITTED"
              ? "pending"
              : taskState?.status === "REJECTED"
                ? "lost"
                : taskState?.status === "APPROVED"
                  ? "available"
                  : "pending";

    return {
      ...serializeReward(reward),
      taskId: linkedTask ? localTaskId(linkedTask.sortOrder) : null,
      category,
      redemption: redemption
        ? {
            id: redemption.id,
            code: redemption.code,
            status: redemption.status,
            redeemedAt: redemption.redeemedAt?.toISOString() ?? null,
            createdAt: redemption.createdAt.toISOString(),
          }
        : null,
    };
  });

  const lotteryEntry = participation.lotteryEntries[0] ?? null;
  const lotteryPoolCount = await prisma.lotteryEntry.count({
    where: { campaignId: participation.campaignId },
  });

  return {
    participation: {
      id: participation.id,
      openid: participation.openid,
      campaignId: participation.campaignId,
      currentTask: participation.currentTask,
      status: participation.status,
    },
    campaign: {
      id: participation.campaign.id,
      title: participation.campaign.title,
      storeName: participation.campaign.store.name,
      storeAddress: participation.campaign.store.address,
      merchantName: participation.campaign.store.merchant.name,
      lotteryDailyQuota: participation.campaign.lotteryDailyQuota,
      lotteryDrawTime: participation.campaign.lotteryDrawTime,
      lotteryMinScore: participation.campaign.lotteryMinScore,
      lotteryActive: participation.campaign.lotteryActive,
    },
    tasks,
    rewards,
    lottery: {
      todayQuota: participation.campaign.lotteryDailyQuota,
      poolCount: lotteryPoolCount,
      drawTime: participation.campaign.lotteryDrawTime,
      active: participation.campaign.lotteryActive,
      minScore: participation.campaign.lotteryMinScore,
      entry: lotteryEntry
        ? {
            id: lotteryEntry.id,
            weight: lotteryEntry.weight,
            status: lotteryEntry.status,
            qualityScore: lotteryEntry.qualityScore,
            drawnAt: lotteryEntry.drawnAt?.toISOString() ?? null,
          }
        : null,
    },
  };
}

export async function listMerchantStepVerifications(input: {
  campaignId: string;
  merchantId: string;
  step: 2 | 3;
}) {
  await assertMerchantCampaign(input.campaignId, input.merchantId);

  const tasks = await prisma.campaignTask.findMany({
    where: { campaignId: input.campaignId, sortOrder: input.step },
    select: { id: true },
  });
  const taskIds = tasks.map((task) => task.id);

  const verifications = await prisma.participationVerification.findMany({
    where: { taskId: { in: taskIds } },
    include: {
      participation: true,
      task: true,
      submission: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return verifications.map((item) => ({
    ...serializeVerification(item),
    userId: item.participation.openid,
    taskTitle: item.task.title,
    submittedAt: item.submission?.submittedAt.toISOString() ?? item.createdAt.toISOString(),
    content: item.submission?.content ?? null,
    imageUrls: item.submission?.imageUrls ?? [],
    platformLink: item.submission?.platformLink ?? item.link,
  }));
}

export async function visualCodeCells(code: string) {
  const digits = code.replace(/\D/g, "").padEnd(6, "0").slice(0, 6);
  return Array.from({ length: 36 }, (_, index) => {
    const digit = Number(digits[index % digits.length]);
    return (digit + index * 3) % 5 === 0 || index % 7 === 0;
  });
}
