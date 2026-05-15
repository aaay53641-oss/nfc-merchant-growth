import {
  CampaignStatus,
  Prisma,
  RewardType,
  Status,
  TaskStatus,
  TaskType,
  VerifyType,
} from "@prisma/client";
import { z } from "zod";

import { HttpError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional()
);

const requiredDate = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date")
  .transform((value) => new Date(value));

const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date")
    .transform((value) => new Date(value))
    .optional()
);

const rewardTypeSchema = z.nativeEnum(RewardType);
const taskTypeSchema = z.nativeEnum(TaskType);
const verifyTypeSchema = z.nativeEnum(VerifyType);
const campaignStatusSchema = z.nativeEnum(CampaignStatus);

export const storePayloadSchema = z.object({
  name: z.string().trim().min(1),
  address: optionalText,
  phone: optionalText,
});

const rewardConfigBaseSchema = z.object({
  type: rewardTypeSchema,
  name: z.string().trim().min(1),
  description: optionalText,
  quantity: z.coerce.number().int().min(0),
  validFrom: optionalDate,
  validUntil: optionalDate,
});

const rewardConfigSchema = rewardConfigBaseSchema.superRefine((value, context) => {
    if (value.validFrom && value.validUntil && value.validUntil < value.validFrom) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "validUntil must be greater than or equal to validFrom",
        path: ["validUntil"],
      });
    }
  });

export const rewardPayloadSchema = rewardConfigBaseSchema
  .extend({
  campaignId: z.string().trim().min(1),
  })
  .superRefine((value, context) => {
    if (value.validFrom && value.validUntil && value.validUntil < value.validFrom) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "validUntil must be greater than or equal to validFrom",
        path: ["validUntil"],
      });
    }
  });

export const campaignTaskPayloadSchema = z.object({
  id: optionalText,
  taskType: taskTypeSchema,
  title: z.string().trim().min(1),
  description: optionalText,
  completionRule: optionalText,
  verifyType: verifyTypeSchema,
  rewardId: z.string().trim().min(1).nullable().optional(),
  reward: rewardConfigSchema.optional(),
});

export const campaignPayloadSchema = z
  .object({
    storeId: z.string().trim().min(1),
    title: z.string().trim().min(1),
    description: optionalText,
    coverImage: optionalText,
    startDate: requiredDate,
    endDate: requiredDate,
    status: campaignStatusSchema.default(CampaignStatus.DRAFT),
    tasks: z.array(campaignTaskPayloadSchema).length(3),
  })
  .superRefine((value, context) => {
    if (value.endDate <= value.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endDate must be greater than startDate",
        path: ["endDate"],
      });
    }
  });

export type StorePayload = z.infer<typeof storePayloadSchema>;
export type CampaignPayload = z.infer<typeof campaignPayloadSchema>;
export type CampaignTaskPayload = z.infer<typeof campaignTaskPayloadSchema>;
export type RewardPayload = z.infer<typeof rewardPayloadSchema>;

const storeWithCountsInclude = {
  _count: {
    select: {
      campaigns: true,
      nfcCards: true,
    },
  },
} satisfies Prisma.StoreInclude;

const campaignInclude = {
  store: true,
  tasks: {
    orderBy: { sortOrder: "asc" },
    include: {
      reward: true,
    },
  },
  rewards: {
    orderBy: { createdAt: "asc" },
  },
  _count: {
    select: {
      participations: true,
    },
  },
} satisfies Prisma.CampaignInclude;

const rewardInclude = {
  campaign: {
    include: {
      store: true,
    },
  },
  _count: {
    select: {
      claims: true,
      Redemption: true,
      campaignTasks: true,
    },
  },
} satisfies Prisma.RewardInclude;

export type StoreWithCounts = Prisma.StoreGetPayload<{
  include: typeof storeWithCountsInclude;
}>;
export type MerchantCampaign = Prisma.CampaignGetPayload<{
  include: typeof campaignInclude;
}>;
export type MerchantReward = Prisma.RewardGetPayload<{
  include: typeof rewardInclude;
}>;

export type MerchantScope = {
  id: string;
  name: string;
};

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export async function resolveMerchantScope(request: Request): Promise<MerchantScope> {
  const merchantId = request.headers.get("x-merchant-id")?.trim();
  const merchant = merchantId
    ? await prisma.merchant.findUnique({ where: { id: merchantId } })
    : await prisma.merchant.findFirst({
        where: {
          status: { in: [Status.APPROVED, Status.ACTIVE] },
        },
        orderBy: { createdAt: "asc" },
      });

  if (!merchant) {
    throw new HttpError("Merchant not found", 404);
  }

  return {
    id: merchant.id,
    name: merchant.name,
  };
}

export async function assertStoreBelongsToMerchant(storeId: string, merchantId: string) {
  const store = await prisma.store.findFirst({
    where: {
      id: storeId,
      merchantId,
    },
  });

  if (!store) {
    throw new HttpError("Store not found", 404);
  }

  return store;
}

export async function assertCampaignBelongsToMerchant(
  campaignId: string,
  merchantId: string
) {
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      store: {
        merchantId,
      },
    },
    include: campaignInclude,
  });

  if (!campaign) {
    throw new HttpError("Campaign not found", 404);
  }

  return campaign;
}

export async function assertRewardBelongsToMerchant(rewardId: string, merchantId: string) {
  const reward = await prisma.reward.findFirst({
    where: {
      id: rewardId,
      campaign: {
        store: {
          merchantId,
        },
      },
    },
    include: rewardInclude,
  });

  if (!reward) {
    throw new HttpError("Reward not found", 404);
  }

  return reward;
}

export function serializeStore(store: StoreWithCounts) {
  return {
    id: store.id,
    name: store.name,
    address: store.address,
    phone: store.phone,
    merchantId: store.merchantId,
    campaignsCount: store._count.campaigns,
    nfcCardsCount: store._count.nfcCards,
    createdAt: store.createdAt.toISOString(),
    updatedAt: store.updatedAt.toISOString(),
  };
}

export function serializeCampaign(campaign: MerchantCampaign) {
  return {
    id: campaign.id,
    title: campaign.title,
    description: campaign.description,
    coverImage: campaign.coverImage,
    storeId: campaign.merchantId,
    storeName: campaign.store.name,
    status: campaign.status,
    startDate: campaign.startDate.toISOString(),
    endDate: campaign.endDate.toISOString(),
    participants: campaign._count.participations,
    tasks: campaign.tasks.map((task) => ({
      id: task.id,
      taskType: task.taskType,
      title: task.title,
      description: task.description,
      completionRule: task.completionRule,
      verifyType: task.verifyType,
      sortOrder: task.sortOrder,
      status: task.status,
      rewardId: task.rewardId,
      reward: task.reward
        ? {
            id: task.reward.id,
            type: task.reward.type,
            name: task.reward.name,
            description: task.reward.description,
            quantity: task.reward.quantity,
            validFrom: toIso(task.reward.validFrom),
            validUntil: toIso(task.reward.validUntil),
          }
        : null,
    })),
    rewards: campaign.rewards.map((reward) => ({
      id: reward.id,
      type: reward.type,
      name: reward.name,
      description: reward.description,
      quantity: reward.quantity,
      validFrom: toIso(reward.validFrom),
      validUntil: toIso(reward.validUntil),
    })),
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}

export function serializeReward(reward: MerchantReward) {
  const issuedCount = reward._count.claims + reward._count.Redemption;

  return {
    id: reward.id,
    campaignId: reward.campaignId,
    campaignTitle: reward.campaign.title,
    storeId: reward.campaign.merchantId,
    storeName: reward.campaign.store.name,
    type: reward.type,
    name: reward.name,
    description: reward.description,
    quantity: reward.quantity,
    issuedCount,
    remainingQuantity: Math.max(0, reward.quantity - issuedCount),
    validFrom: toIso(reward.validFrom),
    validUntil: toIso(reward.validUntil),
    linkedTasksCount: reward._count.campaignTasks,
    createdAt: reward.createdAt.toISOString(),
    updatedAt: reward.updatedAt.toISOString(),
  };
}

export async function listMerchantStores(merchantId: string) {
  return prisma.store.findMany({
    where: { merchantId },
    orderBy: { createdAt: "desc" },
    include: storeWithCountsInclude,
  });
}

export async function listMerchantCampaigns(input: {
  merchantId: string;
  storeId?: string | null;
}) {
  if (input.storeId) {
    await assertStoreBelongsToMerchant(input.storeId, input.merchantId);
  }

  return prisma.campaign.findMany({
    where: {
      merchantId: input.storeId ?? undefined,
      store: {
        merchantId: input.merchantId,
      },
    },
    orderBy: { createdAt: "desc" },
    include: campaignInclude,
  });
}

export async function listMerchantRewards(merchantId: string) {
  return prisma.reward.findMany({
    where: {
      campaign: {
        store: {
          merchantId,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    include: rewardInclude,
  });
}

export async function resolveRewardForTask(input: {
  campaignId: string;
  merchantId: string;
  task: CampaignTaskPayload;
}) {
  if (input.task.rewardId) {
    const reward = await assertRewardBelongsToMerchant(
      input.task.rewardId,
      input.merchantId
    );

    if (reward.campaignId !== input.campaignId) {
      throw new HttpError("Reward does not belong to campaign", 400);
    }

    return reward.id;
  }

  if (!input.task.reward) {
    return null;
  }

  const reward = await prisma.reward.create({
    data: {
      campaignId: input.campaignId,
      type: input.task.reward.type,
      name: input.task.reward.name,
      description: input.task.reward.description,
      quantity: input.task.reward.quantity,
      validFrom: input.task.reward.validFrom,
      validUntil: input.task.reward.validUntil,
    },
  });

  return reward.id;
}

export async function updateTaskRewardConfig(input: {
  campaignId: string;
  task: CampaignTaskPayload;
  existingRewardId: string | null;
}) {
  if (!input.task.reward) {
    return input.task.rewardId ?? input.existingRewardId;
  }

  if (input.existingRewardId) {
    const reward = await prisma.reward.update({
      where: { id: input.existingRewardId },
      data: {
        type: input.task.reward.type,
        name: input.task.reward.name,
        description: input.task.reward.description,
        quantity: input.task.reward.quantity,
        validFrom: input.task.reward.validFrom,
        validUntil: input.task.reward.validUntil,
      },
    });

    return reward.id;
  }

  const reward = await prisma.reward.create({
    data: {
      campaignId: input.campaignId,
      type: input.task.reward.type,
      name: input.task.reward.name,
      description: input.task.reward.description,
      quantity: input.task.reward.quantity,
      validFrom: input.task.reward.validFrom,
      validUntil: input.task.reward.validUntil,
    },
  });

  return reward.id;
}

export { campaignInclude, rewardInclude, storeWithCountsInclude };
