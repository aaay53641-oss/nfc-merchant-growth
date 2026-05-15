import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.merchantId) {
    return NextResponse.json({ error: "Merchant scope missing" }, { status: 403 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const stores = await prisma.store.findMany({
    where: { merchantId: session.merchantId },
    select: { id: true },
  });
  const storeIds = stores.map((store) => store.id);
  const campaigns = await prisma.campaign.findMany({
    where: { merchantId: { in: storeIds } },
    select: { id: true },
  });
  const campaignIds = campaigns.map((campaign) => campaign.id);

  const [
    todayNfcTaps,
    todayApproved,
    pendingCount,
    todayRedeemed,
    participations,
  ] = await Promise.all([
    prisma.event.count({
      where: {
        eventType: "nfc_tap",
        createdAt: { gte: today },
        campaignId: { in: campaignIds },
      },
    }),
    prisma.taskSubmission.count({
      where: {
        task: { campaignId: { in: campaignIds } },
        status: "APPROVED",
        submittedAt: { gte: today },
      },
    }),
    prisma.taskSubmission.count({
      where: {
        task: { campaignId: { in: campaignIds } },
        status: "SUBMITTED",
      },
    }),
    prisma.redemption.count({
      where: {
        status: "USED",
        redeemedAt: { gte: today },
        reward: { campaignId: { in: campaignIds } },
      },
    }),
    prisma.participation.findMany({
      where: {
        campaignId: { in: campaignIds },
        createdAt: { gte: sevenDaysAgo },
      },
      select: { createdAt: true },
    }),
  ]);
  const dailyMap = new Map<string, number>();

  for (let index = 0; index < 7; index += 1) {
    const date = new Date(sevenDaysAgo);
    date.setDate(date.getDate() + index);
    dailyMap.set(date.toISOString().slice(0, 10), 0);
  }

  for (const participation of participations) {
    const key = participation.createdAt.toISOString().slice(0, 10);
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
  }

  const weeklyEngagement = Array.from(dailyMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  return NextResponse.json({
    todayNfcTaps,
    todayApproved,
    pendingCount,
    todayRedeemed,
    totalCampaigns: campaignIds.length,
    totalStores: storeIds.length,
    weeklyEngagement,
  });
}
