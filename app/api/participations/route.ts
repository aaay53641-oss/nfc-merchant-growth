import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { unlockFirstTask } from "@/lib/engine/task-engine";
import { logEvent } from "@/lib/engine/events";
import { EventType } from "@prisma/client";

const createSchema = z.object({
  openid: z.string().min(1),
  campaignId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = createSchema.parse(await request.json());

    // Check existing
    const existing = await prisma.participation.findUnique({
      where: { openid_campaignId: { openid: body.openid, campaignId: body.campaignId } },
    });
    if (existing) {
      return NextResponse.json({ participation: existing });
    }

    const participation = await prisma.participation.create({
      data: {
        openid: body.openid,
        campaignId: body.campaignId,
        currentTask: 0,
        status: "UNCLAIMED",
      },
    });

    // Unlock the first task
    await unlockFirstTask(body.campaignId);

    await logEvent({
      eventType: EventType.task_start,
      campaignId: body.campaignId,
      metadata: { openid: body.openid, participationId: participation.id },
    });

    return NextResponse.json({ participation }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "openid and campaignId are required" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
