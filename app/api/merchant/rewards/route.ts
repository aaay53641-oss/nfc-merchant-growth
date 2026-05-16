import { NextRequest, NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api/errors";
import {
  assertCampaignBelongsToMerchant,
  listMerchantRewards,
  resolveMerchantScope,
  rewardInclude,
  rewardPayloadSchema,
  serializeReward,
} from "@/lib/api/merchant";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const merchant = await resolveMerchantScope(request);
    const rewards = await listMerchantRewards(merchant.id);

    return NextResponse.json({
      merchant,
      rewards: rewards.map(serializeReward),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const merchant = await resolveMerchantScope(request);
    const body = rewardPayloadSchema.parse(await request.json());

    await assertCampaignBelongsToMerchant(body.campaignId, merchant.id);

    const reward = await prisma.reward.create({
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

    return NextResponse.json({ reward: serializeReward(reward) }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
