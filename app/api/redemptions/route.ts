import { NextRequest, NextResponse } from "next/server";

import { handleRouteError, HttpError } from "@/lib/api/errors";
import {
  createRedemptionSchema,
  createRedemptionWithUniqueCode,
  serializeReward,
} from "@/lib/api/h5";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = createRedemptionSchema.parse(await request.json());
    const participation = await prisma.participation.findUnique({
      where: { id: body.participationId },
      include: {
        campaign: {
          include: {
            tasks: {
              select: { id: true },
            },
          },
        },
        submissions: {
          where: { status: "APPROVED" },
          select: { taskId: true },
        },
      },
    });

    if (!participation) {
      throw new HttpError("Participation not found", 404);
    }

    const reward = await prisma.reward.findUnique({
      where: { id: body.rewardId },
      include: {
        campaignTasks: {
          select: { id: true },
        },
      },
    });

    if (!reward) {
      throw new HttpError("Reward not found", 404);
    }

    if (reward.campaignId !== participation.campaignId) {
      throw new HttpError("Reward does not belong to participation campaign", 400);
    }

    const approvedTaskIds = new Set(
      participation.submissions.map((submission) => submission.taskId)
    );
    const linkedTaskIds = reward.campaignTasks.map((task) => task.id);
    const rewardUnlocked = linkedTaskIds.length
      ? linkedTaskIds.some((taskId) => approvedTaskIds.has(taskId))
      : participation.campaign.tasks.every((task) => approvedTaskIds.has(task.id));

    if (!rewardUnlocked) {
      throw new HttpError("Reward is not unlocked yet", 409);
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
