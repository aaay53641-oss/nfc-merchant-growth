import { NextRequest, NextResponse } from "next/server";

import { handleRouteError, HttpError } from "@/lib/api/errors";
import {
  assertAllTasksApproved,
  createRedemptionSchema,
  createRedemptionWithUniqueCode,
  serializeReward,
} from "@/lib/api/h5";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = createRedemptionSchema.parse(await request.json());
    const { participation, allApproved } = await assertAllTasksApproved(
      body.participationId
    );

    if (!allApproved) {
      throw new HttpError("All campaign tasks must be approved before claiming rewards", 409);
    }

    const reward = await prisma.reward.findUnique({
      where: { id: body.rewardId },
    });

    if (!reward) {
      throw new HttpError("Reward not found", 404);
    }

    if (reward.campaignId !== participation.campaignId) {
      throw new HttpError("Reward does not belong to participation campaign", 400);
    }

    const existingRedemption = await prisma.redemption.findFirst({
      where: {
        participationId: body.participationId,
        rewardId: body.rewardId,
      },
      include: {
        reward: true,
      },
    });

    const redemption =
      existingRedemption ??
      (await createRedemptionWithUniqueCode({
        participationId: body.participationId,
        rewardId: body.rewardId,
      }));

    return NextResponse.json({
      redemption: {
        id: redemption.id,
        code: redemption.code,
        status: redemption.status,
        reward: serializeReward(redemption.reward),
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
