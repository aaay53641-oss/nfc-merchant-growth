import {
  CampaignStatus,
  ClaimStatus,
  Prisma,
  Role,
  Status,
  TaskStatus,
} from "@prisma/client";
import { z } from "zod";

import { HttpError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";

export const createParticipationSchema = z.object({
  openid: z.string().trim().min(1),
  campaignId: z.string().trim().min(1),
});

export const createSubmissionSchema = z.object({
  participationId: z.string().trim().min(1),
  taskId: z.string().trim().min(1),
  content: z.string().trim().optional(),
  imageUrls: z.array(z.string().trim().min(1)).optional(),
  platformLink: z.string().trim().optional(),
});

export const reviewSubmissionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().trim().optional(),
});

export const createRedemptionSchema = z.object({
  rewardId: z.string().trim().min(1),
  participationId: z.string().trim().min(1),
});

const taskInclude = {
  reward: true,
} satisfies Prisma.CampaignTaskInclude;

const participationInclude = {
  submissions: {
    orderBy: { submittedAt: "desc" },
    include: {
      task: {
        include: {
          reward: true,
        },
      },
    },
  },
} satisfies Prisma.ParticipationInclude;

type RewardWithDates = Prisma.RewardGetPayload<Record<string, never>>;
type TaskWithReward = Prisma.CampaignTaskGetPayload<{
  include: typeof taskInclude;
}>;
type SubmissionWithTask = Prisma.TaskSubmissionGetPayload<{
  include: {
    task: {
      include: {
        reward: true;
      };
    };
  };
}>;
type ParticipationWithSubmissions = Prisma.ParticipationGetPayload<{
  include: typeof participationInclude;
}>;
type CampaignDetail = Prisma.CampaignGetPayload<{
  include: {
    store: {
      include: {
        merchant: true;
      };
    };
    tasks: {
      include: typeof taskInclude;
    };
    rewards: true;
  };
}>;

export type RewardDto = {
  id: string;
  type: string;
  name: string;
  description: string | null;
  quantity: number;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CampaignTaskDto = {
  id: string;
  campaignId: string;
  taskType: string;
  title: string;
  description: string | null;
  completionRule: string | null;
  verifyType: string;
  sortOrder: number;
  status: string;
  startTime: string | null;
  endTime: string | null;
  reward: RewardDto | null;
};

export type ParticipationDto = {
  id: string;
  openid: string;
  campaignId: string;
  currentTask: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

// Public DTO for H5 API responses - excludes openid to prevent leak
export type ParticipationPublicDto = Omit<ParticipationDto, "openid">;

export type SubmissionDto = {
  id: string;
  userId: string;
  taskId: string;
  participationId: string | null;
  content: string | null;
  imageUrls: string[];
  platformLink: string | null;
  status: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  task?: CampaignTaskDto;
};

export type CampaignDetailDto = {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  startDate: string;
  endDate: string;
  merchant: {
    id: string;
    name: string;
    description: string | null;
    logo: string | null;
    contact: string | null;
    phone: string | null;
    address: string | null;
    verified: boolean;
  };
  store: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
  };
  tasks: CampaignTaskDto[];
  rewards: RewardDto[];
};

export async function resolveCampaignPublicId(id: string) {
  if (id !== "demo") return id;

  const now = new Date();
  const campaign =
    (await prisma.campaign.findFirst({
      where: {
        title: { contains: "寻宝" },
        status: CampaignStatus.ACTIVE,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    })) ??
    (await prisma.campaign.findFirst({
      where: {
        title: { contains: "寻宝" },
        status: CampaignStatus.ACTIVE,
      },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    })) ??
    (await prisma.campaign.findFirst({
      where: { title: { contains: "寻宝" } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }));

  if (!campaign) {
    throw new HttpError("Campaign not found", 404);
  }

  return campaign.id;
}

export function serializeReward(reward: RewardWithDates): RewardDto {
  return {
    id: reward.id,
    type: reward.type,
    name: reward.name,
    description: reward.description,
    quantity: reward.quantity,
    imageUrl: reward.imageUrl,
    createdAt: reward.createdAt.toISOString(),
    updatedAt: reward.updatedAt.toISOString(),
  };
}

export function serializeTask(task: TaskWithReward): CampaignTaskDto {
  return {
    id: task.id,
    campaignId: task.campaignId,
    taskType: task.taskType,
    title: task.title,
    description: task.description,
    completionRule: task.completionRule,
    verifyType: task.verifyType,
    sortOrder: task.sortOrder,
    status: task.status,
    startTime: task.startTime?.toISOString() ?? null,
    endTime: task.endTime?.toISOString() ?? null,
    reward: task.reward ? serializeReward(task.reward) : null,
  };
}

export function serializeCampaign(campaign: CampaignDetail): CampaignDetailDto {
  return {
    id: campaign.id,
    title: campaign.title,
    description: campaign.description,
    coverImage: campaign.coverImage,
    startDate: campaign.startDate.toISOString(),
    endDate: campaign.endDate.toISOString(),
    merchant: {
      id: campaign.store.merchant.id,
      name: campaign.store.merchant.name,
      description: campaign.store.merchant.description,
      logo: campaign.store.merchant.logo,
      contact: campaign.store.merchant.contact,
      phone: campaign.store.merchant.phone,
      address: campaign.store.merchant.address,
      verified: campaign.store.merchant.status === Status.APPROVED,
    },
    store: {
      id: campaign.store.id,
      name: campaign.store.name,
      address: campaign.store.address,
      phone: campaign.store.phone,
    },
    tasks: campaign.tasks.map(serializeTask),
    rewards: campaign.rewards.map(serializeReward),
  };
}

export function serializeParticipation(
  participation: ParticipationWithSubmissions | Prisma.ParticipationGetPayload<Record<string, never>>
): ParticipationDto {
  return {
    id: participation.id,
    openid: participation.openid,
    campaignId: participation.campaignId,
    currentTask: participation.currentTask,
    status: participation.status,
    createdAt: participation.createdAt.toISOString(),
    updatedAt: participation.updatedAt.toISOString(),
  };
}

// Serialize participation for H5 public API responses - excludes openid
export function serializeParticipationPublic(
  participation: ParticipationWithSubmissions | Prisma.ParticipationGetPayload<Record<string, never>>
): ParticipationPublicDto {
  return {
    id: participation.id,
    campaignId: participation.campaignId,
    currentTask: participation.currentTask,
    status: participation.status,
    createdAt: participation.createdAt.toISOString(),
    updatedAt: participation.updatedAt.toISOString(),
  };
}

export function serializeSubmission(submission: SubmissionWithTask): SubmissionDto {
  return {
    id: submission.id,
    userId: submission.userId,
    taskId: submission.taskId,
    participationId: submission.participationId,
    content: submission.content,
    imageUrls: submission.imageUrls,
    platformLink: submission.platformLink,
    status: submission.status,
    reviewNote: submission.reviewNote,
    reviewedAt: submission.reviewedAt?.toISOString() ?? null,
    reviewedBy: submission.reviewedBy,
    submittedAt: submission.submittedAt.toISOString(),
    createdAt: submission.createdAt.toISOString(),
    updatedAt: submission.updatedAt.toISOString(),
    task: serializeTask(submission.task),
  };
}

export async function getActiveCampaignOrThrow(id: string) {
  const campaignId = await resolveCampaignPublicId(id);
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      store: {
        include: {
          merchant: true,
        },
      },
      tasks: {
        orderBy: { sortOrder: "asc" },
        include: taskInclude,
      },
      rewards: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!campaign) {
    throw new HttpError("Campaign not found", 404);
  }

  const now = new Date();
  const isActive =
    campaign.status === CampaignStatus.ACTIVE &&
    campaign.startDate <= now &&
    campaign.endDate >= now;

  if (!isActive) {
    throw new HttpError("Campaign is not active", 409, {
      status: campaign.status,
      startDate: campaign.startDate.toISOString(),
      endDate: campaign.endDate.toISOString(),
    });
  }

  return campaign;
}

export async function getCampaignTasksOrThrow(campaignId: string) {
  const campaign = await getActiveCampaignOrThrow(campaignId);

  return prisma.campaignTask.findMany({
    where: { campaignId: campaign.id },
    orderBy: { sortOrder: "asc" },
    include: taskInclude,
  });
}

export async function getParticipationOrThrow(id: string, tx?: Prisma.TransactionClient) {
  const participation = await (tx ?? prisma).participation.findUnique({
    where: { id },
    include: participationInclude,
  });

  if (!participation) {
    throw new HttpError("Participation not found", 404);
  }

  return participation;
}

export async function getOrCreateUserForOpenid(openid: string, tx?: Prisma.TransactionClient) {
  return (tx ?? prisma).user.upsert({
    where: { wechatId: openid },
    create: {
      wechatId: openid,
      nickname: `H5用户${openid.slice(-6)}`,
      role: Role.MERCHANT_STAFF,
    },
    update: {},
  });
}

export async function refreshParticipationProgress(participationId: string) {
  const participation = await prisma.participation.findUnique({
    where: { id: participationId },
    include: {
      campaign: {
        include: {
          tasks: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              sortOrder: true,
            },
          },
        },
      },
      submissions: {
        where: { status: TaskStatus.APPROVED },
        select: {
          taskId: true,
        },
      },
    },
  });

  if (!participation) {
    throw new HttpError("Participation not found", 404);
  }

  const approvedTaskIds = new Set(
    participation.submissions.map((submission) => submission.taskId)
  );
  const approvedSortOrders = participation.campaign.tasks
    .filter((task) => approvedTaskIds.has(task.id))
    .map((task) => task.sortOrder);
  const currentTask = approvedSortOrders.length ? Math.max(...approvedSortOrders) : 0;

  return prisma.participation.update({
    where: { id: participationId },
    data: { currentTask },
    include: participationInclude,
  });
}

export async function assertAllTasksApproved(participationId: string) {
  const participation = await prisma.participation.findUnique({
    where: { id: participationId },
    include: {
      campaign: {
        include: {
          tasks: {
            select: { id: true },
          },
        },
      },
      submissions: {
        where: { status: TaskStatus.APPROVED },
        select: { taskId: true },
      },
    },
  });

  if (!participation) {
    throw new HttpError("Participation not found", 404);
  }

  if (participation.campaign.tasks.length === 0) {
    throw new HttpError("No campaign tasks configured", 409);
  }

  const approvedTaskIds = new Set(
    participation.submissions.map((submission) => submission.taskId)
  );
  const allApproved = participation.campaign.tasks.every((task) =>
    approvedTaskIds.has(task.id)
  );

  return {
    participation,
    allApproved,
  };
}

export function generateRedemptionCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createRedemptionWithUniqueCode(
  input: { participationId: string; rewardId: string },
  tx?: Prisma.TransactionClient
) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      return await (tx ?? prisma).redemption.create({
        data: {
          participationId: input.participationId,
          rewardId: input.rewardId,
          code: generateRedemptionCode(),
          status: ClaimStatus.CLAIMED,
        },
        include: {
          reward: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new HttpError("Failed to generate unique redemption code", 500);
}
