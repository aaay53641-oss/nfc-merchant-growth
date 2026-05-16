import { NextRequest, NextResponse } from "next/server";
import { EventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const CLIENT_EVENT_TYPES = new Set<string>([
  "page_view",
  "rule_view",
  "ai_generate",
  "copy_text",
  "platform_jump",
  "proof_upload",
]);

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

// POST — client-side event logging (for page_view, ai_generate, etc.)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, userId, campaignId, nfcCardId, metadata } = body;

    if (!eventType || !CLIENT_EVENT_TYPES.has(eventType)) {
      return NextResponse.json({ error: "Invalid eventType" }, { status: 400 });
    }

    const event = await prisma.event.create({
      data: {
        eventType: eventType as EventType,
        userId: userId ?? null,
        campaignId: campaignId ?? null,
        nfcCardId: nfcCardId ?? null,
        metadata: metadata ?? {},
      },
    });

    return NextResponse.json({ id: event.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to log event" }, { status: 500 });
  }
}
