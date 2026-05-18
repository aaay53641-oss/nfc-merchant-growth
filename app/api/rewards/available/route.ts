import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { handleRouteError, HttpError } from "@/lib/api/errors";
import { resolveCampaignPublicId } from "@/lib/api/h5";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const optionalQueryText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value : undefined),
  z.string().trim().min(1).optional()
);

const availableRewardsQuerySchema = z
  .object({
    participationId: optionalQueryText,
    campaignId: optionalQueryText,
  })
  .refine((value) => value.participationId || value.campaignId, {
    message: "participationId or campaignId is required",
  });

function toLocalTaskId(sortOrder: number | null | undefined) {
  if (sortOrder === 1) return "l1";
  if (sortOrder === 2) return "l2";
  if (sortOrder === 3) return "l3";
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const query = availableRewardsQuerySchema.parse({
      participationId: request.nextUrl.searchParams.get("participationId"),
      campaignId: request.nextUrl.searchParams.get("campaignId"),
    });

    const participation = query.participationId
      ? await prisma.participation.findUnique({
          where: { id: query.participationId },
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
        })
      : null;

    if (query.participationId && !participation) {
      throw new HttpError("Participation not found", 404);
    }

    const campaignId = participation
      ? participation.campaignId
      : await resolveCampaignPublicId(query.campaignId!);

    const approvedTaskIds = new Set(participation?.submissions.map((submission) => submission.taskId) ?? []);
    const allApproved = participation
      ? participation.campaign.tasks.length > 0 &&
        participation.campaign.tasks.every((task) => approvedTaskIds.has(task.id))
      : false;

    const [rewards, participationRedemptions] = await Promise.all([
      prisma.reward.findMany({
        where: { campaignId },
        orderBy: { createdAt: "asc" },
        include: {
          campaignTasks: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              sortOrder: true,
            },
          },
          _count: {
            select: {
              claims: true,
              Redemption: true,
            },
          },
        },
      }),
      participation
        ? prisma.redemption.findMany({
            where: { participationId: participation.id },
            select: {
              id: true,
              rewardId: true,
              code: true,
              status: true,
              redeemedAt: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const redemptionsByRewardId = new Map(
      participationRedemptions.map((redemption) => [redemption.rewardId, redemption])
    );

    return NextResponse.json({
      allTasksApproved: allApproved,
      rewards: rewards.map((reward) => {
        const claimedCount = reward._count.claims + reward._count.Redemption;
        const remainingStock = Math.max(0, reward.quantity - claimedCount);
        const redemption = redemptionsByRewardId.get(reward.id);
        const linkedTask = reward.campaignTasks[0];

        return {
          id: reward.id,
          taskId: toLocalTaskId(linkedTask?.sortOrder),
          type: reward.type,
          name: reward.name,
          description: reward.description,
          quantity: reward.quantity,
          totalStock: reward.quantity,
          remainingStock,
          claimedCount,
          isSoldOut: reward.quantity > 0 && remainingStock === 0,
          imageUrl: reward.imageUrl,
          validFrom: reward.validFrom?.toISOString() ?? null,
          validUntil: reward.validUntil?.toISOString() ?? null,
          createdAt: reward.createdAt.toISOString(),
          updatedAt: reward.updatedAt.toISOString(),
          redemption: redemption
            ? {
                id: redemption.id,
                code: redemption.code,
                status: redemption.status,
                redeemedAt: redemption.redeemedAt?.toISOString() ?? null,
              }
            : null,
        };
      }),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleRouteError(new HttpError("participationId or campaignId is required", 400, error.flatten()));
    }

    return handleRouteError(error);
  }
}
