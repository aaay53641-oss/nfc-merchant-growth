import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const participationId = request.nextUrl.searchParams.get("participationId");
  const campaignId = request.nextUrl.searchParams.get("campaignId");
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "50"), 200);

  if (!participationId && !campaignId) {
    return NextResponse.json({ error: "participationId or campaignId required" }, { status: 400 });
  }

  const where: any = {};
  if (participationId) {
    where.OR = [
      { metadata: { path: ["participationId"], equals: participationId } },
    ];
  }
  if (campaignId) {
    where.campaignId = campaignId;
  }

  try {
    const events = await prisma.event.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        eventType: true,
        metadata: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      events: events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        metadata: e.metadata,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch {
    // Fallback: simple query without metadata filter for campaign-scoped queries
    const events = await prisma.event.findMany({
      where: campaignId ? { campaignId } : {},
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      events: events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        metadata: e.metadata,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  }
}
