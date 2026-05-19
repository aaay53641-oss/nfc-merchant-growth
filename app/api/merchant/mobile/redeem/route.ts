import { ClaimStatus } from "@prisma/client";
import { z } from "zod";

import { HttpError } from "@/lib/api/errors";
import { resolveMerchantScope } from "@/lib/api/merchant";
import { sprintError, sprintSuccess, visualCodeCells } from "@/lib/api/sprint10";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const redeemSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "请输入 6 位数字核销码"),
});

async function findMerchantRedemption(code: string, merchantId: string) {
  const redemption = await prisma.redemption.findFirst({
    where: {
      code,
      reward: {
        campaign: {
          store: { merchantId },
        },
      },
    },
    include: {
      participation: true,
      reward: {
        include: {
          campaign: {
            include: {
              store: true,
            },
          },
        },
      },
    },
  });

  if (!redemption) throw new HttpError("核销码不存在或不属于当前商家", 404);
  return redemption;
}

function serializeRedemption(
  redemption: Awaited<ReturnType<typeof findMerchantRedemption>>
) {
  return {
    id: redemption.id,
    code: redemption.code,
    visualCodeCells: redemption.code ? [] : [],
    status: redemption.status,
    redeemedAt: redemption.redeemedAt?.toISOString() ?? null,
    createdAt: redemption.createdAt.toISOString(),
    reward: {
      id: redemption.reward.id,
      name: redemption.reward.name,
      description: redemption.reward.description,
      validFrom: redemption.reward.validFrom?.toISOString() ?? null,
      validUntil: redemption.reward.validUntil?.toISOString() ?? null,
    },
    campaign: {
      id: redemption.reward.campaign.id,
      title: redemption.reward.campaign.title,
    },
    store: {
      id: redemption.reward.campaign.store.id,
      name: redemption.reward.campaign.store.name,
      address: redemption.reward.campaign.store.address,
      phone: redemption.reward.campaign.store.phone,
    },
    participation: {
      id: redemption.participation.id,
      openid: redemption.participation.openid,
    },
  };
}

export async function GET(request: Request) {
  try {
    const merchant = await resolveMerchantScope(request);
    const url = new URL(request.url);
    const parsed = redeemSchema.parse({ code: url.searchParams.get("code") ?? "" });
    const redemption = await findMerchantRedemption(parsed.code, merchant.id);
    return sprintSuccess({
      redemption: {
        ...serializeRedemption(redemption),
        visualCodeCells: await visualCodeCells(redemption.code),
      },
    });
  } catch (error) {
    return sprintError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const merchant = await resolveMerchantScope(request);
    const body = redeemSchema.parse(await request.json());
    const redemption = await findMerchantRedemption(body.code, merchant.id);

    if (redemption.status === ClaimStatus.USED) {
      throw new HttpError("该奖励已核销", 409);
    }
    if (redemption.status === ClaimStatus.CANCELLED) {
      throw new HttpError("该奖励已取消", 409);
    }
    if (redemption.reward.validUntil && redemption.reward.validUntil < new Date()) {
      await prisma.redemption.update({
        where: { id: redemption.id },
        data: { status: ClaimStatus.EXPIRED },
      });
      throw new HttpError("该奖励已过期", 409);
    }

    const updated = await prisma.redemption.update({
      where: { id: redemption.id },
      data: {
        status: ClaimStatus.USED,
        redeemedAt: new Date(),
      },
      include: {
        participation: true,
        reward: {
          include: {
            campaign: {
              include: {
                store: true,
              },
            },
          },
        },
      },
    });

    await prisma.event.create({
      data: {
        eventType: "reward_used",
        campaignId: updated.reward.campaignId,
        metadata: {
          redemptionId: updated.id,
          rewardId: updated.rewardId,
          storeId: updated.reward.campaign.store.id,
        },
      },
    });

    return sprintSuccess({
      redemption: {
        ...serializeRedemption(updated),
        visualCodeCells: await visualCodeCells(updated.code),
      },
    });
  } catch (error) {
    return sprintError(error);
  }
}
