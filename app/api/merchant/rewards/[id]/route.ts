import { NextRequest, NextResponse } from "next/server";

import { handleRouteError, HttpError } from "@/lib/api/errors";
import {
  assertCampaignBelongsToMerchant,
  assertRewardBelongsToMerchant,
  resolveMerchantScope,
  rewardInclude,
  rewardPayloadSchema,
  serializeReward,
} from "@/lib/api/merchant";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RewardRouteParams = {
  params: {
    id: string;
  };
};

export async function PATCH(request: NextRequest, { params }: RewardRouteParams) {
  try {
    const merchant = await resolveMerchantScope(request);
    await assertRewardBelongsToMerchant(params.id, merchant.id);
    const body = rewardPayloadSchema.parse(await request.json());

    await assertCampaignBelongsToMerchant(body.campaignId, merchant.id);

    const reward = await prisma.reward.update({
      where: { id: params.id },
      data: {
        campaignId: body.campaignId,
        type: body.type,
        name: body.name,
        description: body.description,
        quantity: body.quantity,
        validFrom: body.validFrom,
        validUntil: body.validUntil,
      },
      include: rewardInclude,
    });

    return NextResponse.json({ reward: serializeReward(reward) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RewardRouteParams) {
  try {
    const merchant = await resolveMerchantScope(request);
    const reward = await assertRewardBelongsToMerchant(params.id, merchant.id);
    const blockers = {
      linkedTasks: reward._count.campaignTasks,
      claims: reward._count.claims,
      redemptions: reward._count.Redemption,
    };
    const hasBlockers = Object.values(blockers).some((count) => count > 0);

    if (hasBlockers) {
      throw new HttpError("Reward has related records and cannot be deleted", 409, blockers);
    }

    await prisma.reward.delete({ where: { id: params.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
