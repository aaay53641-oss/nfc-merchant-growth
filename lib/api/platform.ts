import {
  CampaignStatus,
  Prisma,
  Role,
  Status,
} from "@prisma/client";
import { z } from "zod";

import { HttpError } from "@/lib/api/errors";
import { getSession, type SessionPayload } from "@/lib/auth/session";
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

export const platformLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const merchantReviewSchema = z
  .object({
    status: z.enum([Status.APPROVED, Status.REJECTED]),
    reviewNote: optionalText,
  })
  .superRefine((value, context) => {
    if (value.status === Status.REJECTED && !value.reviewNote) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "reviewNote is required when rejecting a merchant",
        path: ["reviewNote"],
      });
    }
  });

export const platformStorePatchSchema = z.object({
  status: z.enum([Status.ACTIVE, Status.INACTIVE]),
});

export const platformCampaignPatchSchema = z.object({
  status: z.enum([
    CampaignStatus.ACTIVE,
    CampaignStatus.PAUSED,
    CampaignStatus.ENDED,
  ]),
});

export const alliancePartnerPayloadSchema = z.object({
  merchantId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  type: optionalText,
  contactName: optionalText,
  contactPhone: optionalText,
  status: z.enum([Status.ACTIVE, Status.INACTIVE]).default(Status.ACTIVE),
});

const allianceCouponBaseSchema = z.object({
  partnerId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: optionalText,
  discount: z.coerce.number().min(0),
  validFrom: requiredDate,
  validUntil: requiredDate,
});

export const allianceCouponPayloadSchema = allianceCouponBaseSchema
  .superRefine((value, context) => {
    if (value.validUntil < value.validFrom) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "validUntil must be greater than or equal to validFrom",
        path: ["validUntil"],
      });
    }
  });

export const allianceCouponUpdatePayloadSchema = allianceCouponBaseSchema
  .partial()
  .superRefine((value, context) => {
    if (value.validFrom && value.validUntil && value.validUntil < value.validFrom) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "validUntil must be greater than or equal to validFrom",
        path: ["validUntil"],
      });
    }
  });

const platformMerchantInclude = {
  user: {
    select: {
      id: true,
      email: true,
      nickname: true,
    },
  },
  _count: {
    select: {
      stores: true,
      alliancePartners: true,
    },
  },
} satisfies Prisma.MerchantInclude;

const platformStoreInclude = {
  merchant: {
    select: {
      id: true,
      name: true,
      status: true,
    },
  },
  _count: {
    select: {
      campaigns: true,
      nfcCards: true,
    },
  },
} satisfies Prisma.StoreInclude;

const platformCampaignInclude = {
  store: {
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
  },
  _count: {
    select: {
      participations: true,
    },
  },
} satisfies Prisma.CampaignInclude;

const platformNfcCardInclude = {
  store: {
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  campaign: {
    select: {
      id: true,
      title: true,
      status: true,
    },
  },
} satisfies Prisma.NfcCardInclude;

const alliancePartnerInclude = {
  merchant: {
    select: {
      id: true,
      name: true,
    },
  },
  _count: {
    select: {
      AllianceCoupon: true,
    },
  },
} satisfies Prisma.AlliancePartnerInclude;

const allianceCouponInclude = {
  partner: {
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  _count: {
    select: {
      claims: true,
    },
  },
} satisfies Prisma.AllianceCouponInclude;

export type PlatformMerchant = Prisma.MerchantGetPayload<{
  include: typeof platformMerchantInclude;
}>;
export type PlatformStore = Prisma.StoreGetPayload<{
  include: typeof platformStoreInclude;
}>;
export type PlatformCampaign = Prisma.CampaignGetPayload<{
  include: typeof platformCampaignInclude;
}>;
export type PlatformNfcCard = Prisma.NfcCardGetPayload<{
  include: typeof platformNfcCardInclude;
}>;
export type PlatformAlliancePartner = Prisma.AlliancePartnerGetPayload<{
  include: typeof alliancePartnerInclude;
}>;
export type PlatformAllianceCoupon = Prisma.AllianceCouponGetPayload<{
  include: typeof allianceCouponInclude;
}>;

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export async function requirePlatformSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new HttpError("Unauthorized", 401);
  }

  if (session.role !== Role.PLATFORM) {
    throw new HttpError("Forbidden", 403);
  }

  return session;
}

export async function createAuditLog(input: {
  action: string;
  actorId?: string | null;
  targetType: string;
  targetId: string;
  detail?: Prisma.InputJsonValue;
}) {
  return prisma.auditLog.create({
    data: {
      action: input.action,
      actorId: input.actorId ?? null,
      actorRole: Role.PLATFORM,
      targetType: input.targetType,
      targetId: input.targetId,
      detail: input.detail ?? Prisma.JsonNull,
    },
  });
}

export function serializePlatformSession(session: SessionPayload) {
  return {
    user: {
      userId: session.userId,
      email: session.email,
      role: session.role,
    },
  };
}

export function serializePlatformMerchant(merchant: PlatformMerchant) {
  return {
    id: merchant.id,
    name: merchant.name,
    description: merchant.description,
    logo: merchant.logo,
    contact: merchant.contact,
    phone: merchant.phone,
    address: merchant.address,
    businessLicense: merchant.businessLicense,
    legalPerson: merchant.legalPerson,
    status: merchant.status,
    reviewNote: merchant.reviewNote,
    reviewedAt: toIso(merchant.reviewedAt),
    reviewedBy: merchant.reviewedBy,
    user: merchant.user,
    storesCount: merchant._count.stores,
    alliancePartnersCount: merchant._count.alliancePartners,
    createdAt: merchant.createdAt.toISOString(),
    updatedAt: merchant.updatedAt.toISOString(),
  };
}

export function serializePlatformStore(store: PlatformStore) {
  return {
    id: store.id,
    name: store.name,
    address: store.address,
    phone: store.phone,
    status: store.status,
    merchantId: store.merchantId,
    merchantName: store.merchant.name,
    merchantStatus: store.merchant.status,
    campaignsCount: store._count.campaigns,
    nfcCardsCount: store._count.nfcCards,
    createdAt: store.createdAt.toISOString(),
    updatedAt: store.updatedAt.toISOString(),
  };
}

export function serializePlatformCampaign(campaign: PlatformCampaign) {
  return {
    id: campaign.id,
    title: campaign.title,
    description: campaign.description,
    coverImage: campaign.coverImage,
    storeId: campaign.merchantId,
    storeName: campaign.store.name,
    merchantId: campaign.store.merchant.id,
    merchantName: campaign.store.merchant.name,
    status: campaign.status,
    startDate: campaign.startDate.toISOString(),
    endDate: campaign.endDate.toISOString(),
    participants: campaign._count.participations,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}

export function serializePlatformNfcCard(card: PlatformNfcCard) {
  return {
    id: card.id,
    code: card.code,
    tableNumber: card.tableNumber,
    status: card.status,
    storeId: card.storeId,
    storeName: card.store.name,
    merchantId: card.store.merchant.id,
    merchantName: card.store.merchant.name,
    campaignId: card.campaignId,
    campaignTitle: card.campaign?.title ?? null,
    campaignStatus: card.campaign?.status ?? null,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}

export function serializeAlliancePartner(partner: PlatformAlliancePartner) {
  return {
    id: partner.id,
    name: partner.name,
    type: partner.type,
    contactName: partner.contactName,
    contactPhone: partner.contactPhone,
    status: partner.status,
    merchantId: partner.merchantId,
    merchantName: partner.merchant.name,
    couponsCount: partner._count.AllianceCoupon,
    createdAt: partner.createdAt.toISOString(),
    updatedAt: partner.updatedAt.toISOString(),
  };
}

export function serializeAllianceCoupon(coupon: PlatformAllianceCoupon) {
  return {
    id: coupon.id,
    name: coupon.name,
    description: coupon.description,
    discount: coupon.discount,
    validFrom: coupon.validFrom.toISOString(),
    validUntil: coupon.validUntil.toISOString(),
    partnerId: coupon.partnerId,
    partnerName: coupon.partner.name,
    partnerStatus: coupon.partner.status,
    merchantId: coupon.partner.merchant.id,
    merchantName: coupon.partner.merchant.name,
    claimsCount: coupon._count.claims,
    createdAt: coupon.createdAt.toISOString(),
    updatedAt: coupon.updatedAt.toISOString(),
  };
}

export {
  allianceCouponInclude,
  alliancePartnerInclude,
  platformCampaignInclude,
  platformMerchantInclude,
  platformNfcCardInclude,
  platformStoreInclude,
};
