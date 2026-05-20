import { NextRequest } from "next/server";

import { HttpError } from "@/lib/api/errors";
import { resolveCampaignPublicId } from "@/lib/api/h5";
import { sprintError, sprintSuccess } from "@/lib/api/sprint10";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: { id: string };
};

function lotteryStatus(status?: string | null) {
  if (status === "WON") return "won" as const;
  if (status === "LOST") return "lost" as const;
  return "pending" as const;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const campaignId = await resolveCampaignPublicId(params.id);
    const participationId = request.nextUrl.searchParams.get("participationId");

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        lotteryDailyQuota: true,
        lotteryDrawTime: true,
        lotteryActive: true,
      },
    });

    if (!campaign) throw new HttpError("Campaign not found", 404);

    const [entryCount, participation] = await Promise.all([
      prisma.lotteryEntry.count({ where: { campaignId } }),
      participationId
        ? prisma.participation.findFirst({
            where: { id: participationId, campaignId },
            include: {
              lotteryEntries: {
                where: { campaignId },
                take: 1,
              },
            },
          })
        : Promise.resolve(null),
    ]);

    if (participationId && !participation) {
      throw new HttpError("Participation not found", 404);
    }

    const entry = participation?.lotteryEntries[0] ?? null;

    return sprintSuccess({
      dailyQuota: campaign.lotteryDailyQuota,
      entryCount,
      myChances: entry?.weight ?? 0,
      drawTime: campaign.lotteryDrawTime,
      status: lotteryStatus(entry?.status),
      active: campaign.lotteryActive,
    });
  } catch (error) {
    return sprintError(error);
  }
}
