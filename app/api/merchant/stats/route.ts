import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const mid = session.merchantId;

  // Fetch stores for this merchant first
  const storeIds = (await prisma.store.findMany({ where: { merchantId: mid }, select: { id: true } })).map((s) => s.id);
  const campaignIds = (await prisma.campaign.findMany({ where: { merchantId: { in: storeIds } }, select: { id: true } })).map((c) => c.id);

  const [
    todayNfcTaps,
    todayApproved,
    pendingCount,
    todayRedeemed,
    totalCampaigns,
    totalStores,
    weeklyEngagement,
  ] = await Promise.all([
    prisma.event.count({ where: { eventType: "nfc_tap", createdAt: { gte: today } } }),
    prisma.taskSubmission.count({ where: { task: { campaignId: { in: campaignIds } }, status: "APPROVED", submittedAt: { gte: today } } }),
    prisma.taskSubmission.count({ where: { task: { campaignId: { in: campaignIds } }, status: "SUBMITTED" } }),
    prisma.redemption.count({ where: { status: "USED", updatedAt: { gte: today }, reward: { campaignId: { in: campaignIds } } } }),
    campaignIds.length,
    storeIds.length,
    (prisma as any).participation.groupBy?.({
      by: ["createdAt"],
      where: { campaignId: { in: campaignIds }, createdAt: { gte: weekStart } },
      _count: { id: true },
      orderBy: { createdAt: "asc" },
    }) ?? [],
  ]);

  return NextResponse.json({
    todayNfcTaps,
    todayApproved,
    pendingCount,
    todayRedeemed,
    totalCampaigns,
    totalStores,
    weeklyEngagement: weeklyEngagement.map((d: any) => ({
      date: d.createdAt.toISOString().slice(0, 10),
      count: d._count.id,
    })),
  });
}
