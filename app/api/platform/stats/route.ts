import { Status } from "@prisma/client";
import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api/errors";
import { requirePlatformSession } from "@/lib/api/platform";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function buildSevenDayMap(start: Date) {
  const dailyMap = new Map<string, number>();
  for (let index = 0; index < 7; index += 1) {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    dailyMap.set(date.toISOString().slice(0, 10), 0);
  }
  return dailyMap;
}

function toTrend(dailyMap: Map<string, number>) {
  return Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }));
}

export async function GET() {
  try {
    await requirePlatformSession();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const [
      totalMerchants,
      activeMerchants,
      totalStores,
      totalCampaigns,
      totalParticipations,
      totalRedemptions,
      usedRedemptions,
      weeklyMerchants,
      weeklyParticipations,
      merchants,
      campaigns,
      redemptions,
    ] = await Promise.all([
      prisma.merchant.count(),
      prisma.merchant.count({
        where: { status: { in: [Status.APPROVED, Status.ACTIVE] } },
      }),
      prisma.store.count(),
      prisma.campaign.count(),
      prisma.participation.count(),
      prisma.redemption.count(),
      prisma.redemption.count({ where: { status: "USED" } }),
      prisma.merchant.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
      }),
      prisma.participation.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
      }),
      prisma.merchant.findMany({
        select: { id: true, name: true },
      }),
      prisma.campaign.findMany({
        select: {
          id: true,
          store: { select: { merchantId: true } },
          _count: { select: { participations: true } },
        },
      }),
      prisma.redemption.findMany({
        where: { status: "USED" },
        select: {
          reward: {
            select: {
              campaign: {
                select: {
                  store: { select: { merchantId: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    const weeklyNewMerchantsMap = buildSevenDayMap(sevenDaysAgo);
    for (const merchant of weeklyMerchants) {
      const key = merchant.createdAt.toISOString().slice(0, 10);
      weeklyNewMerchantsMap.set(key, (weeklyNewMerchantsMap.get(key) ?? 0) + 1);
    }

    const weeklyParticipationsMap = buildSevenDayMap(sevenDaysAgo);
    for (const participation of weeklyParticipations) {
      const key = participation.createdAt.toISOString().slice(0, 10);
      weeklyParticipationsMap.set(key, (weeklyParticipationsMap.get(key) ?? 0) + 1);
    }

    const merchantMap = new Map(
      merchants.map((merchant) => [
        merchant.id,
        { merchantId: merchant.id, merchantName: merchant.name, participants: 0, redemptions: 0 },
      ])
    );

    for (const campaign of campaigns) {
      const summary = merchantMap.get(campaign.store.merchantId);
      if (summary) summary.participants += campaign._count.participations;
    }

    for (const redemption of redemptions) {
      const merchantId = redemption.reward.campaign.store.merchantId;
      const summary = merchantMap.get(merchantId);
      if (summary) summary.redemptions += 1;
    }

    const topMerchants = Array.from(merchantMap.values())
      .sort((left, right) => {
        if (right.participants !== left.participants) {
          return right.participants - left.participants;
        }
        return right.redemptions - left.redemptions;
      })
      .slice(0, 10);

    return NextResponse.json({
      stats: {
        totalMerchants,
        activeMerchants,
        totalStores,
        totalCampaigns,
        totalParticipations,
        totalRedemptions: usedRedemptions,
        redemptionRate:
          totalRedemptions === 0 ? 0 : Number((usedRedemptions / totalRedemptions).toFixed(4)),
      },
      weeklyNewMerchants: toTrend(weeklyNewMerchantsMap),
      weeklyParticipations: toTrend(weeklyParticipationsMap),
      topMerchants,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
