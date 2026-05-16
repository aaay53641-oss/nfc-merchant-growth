import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { handleRouteError, HttpError } from "@/lib/api/errors";
import { assertAllTasksApproved, serializeReward } from "@/lib/api/h5";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const availableRewardsQuerySchema = z.object({
  participationId: z.string().trim().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const query = availableRewardsQuerySchema.parse({
      participationId: request.nextUrl.searchParams.get("participationId"),
    });
    const { participation, allApproved } = await assertAllTasksApproved(
      query.participationId
    );

    if (!allApproved) {
      return NextResponse.json({
        allTasksApproved: false,
        rewards: [],
      });
    }

    const claimedRedemptions = await prisma.redemption.findMany({
      where: { participationId: participation.id },
      select: { rewardId: true },
    });
    const claimedRewardIds = new Set(
      claimedRedemptions.map((redemption) => redemption.rewardId)
    );
    const rewards = await prisma.reward.findMany({
      where: {
        campaignId: participation.campaignId,
        id: { notIn: Array.from(claimedRewardIds) },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      allTasksApproved: true,
      rewards: rewards.map(serializeReward),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleRouteError(new HttpError("participationId is required", 400));
    }

    return handleRouteError(error);
  }
}
