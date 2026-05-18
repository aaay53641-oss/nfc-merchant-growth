import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { handleRouteError } from "@/lib/api/errors";
import {
  createParticipationSchema,
  getActiveCampaignOrThrow,
  getOrCreateUserForOpenid,
  refreshParticipationProgress,
  resolveCampaignPublicId,
  serializeParticipation,
} from "@/lib/api/h5";
import { prisma } from "@/lib/prisma";
import { unlockFirstTask } from "@/lib/engine/task-engine";
import { EventType } from "@prisma/client";

const createSchema = createParticipationSchema;

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = createSchema.parse(await request.json());
    const campaignId = await resolveCampaignPublicId(body.campaignId);

    // Check if already exists — return existing participation
    const existing = await prisma.participation.findUnique({
      where: {
        openid_campaignId: {
          openid: body.openid,
          campaignId,
        },
      },
    });

    if (existing) {
      const synced = await refreshParticipationProgress(existing.id);
      return NextResponse.json({ participation: serializeParticipation(synced) });
    }

    // Validate campaign is active
    await getActiveCampaignOrThrow(campaignId);
    await getOrCreateUserForOpenid(body.openid);

    // Create new participation
    const participation = await prisma.participation.create({
      data: {
        openid: body.openid,
        campaignId,
        currentTask: 0,
        status: "UNCLAIMED",
      },
    });

    // Unlock the first task on new participation
    await unlockFirstTask(campaignId);

    // Log task_start event
    await prisma.event.create({
      data: {
        eventType: EventType.task_start,
        campaignId,
        metadata: { openid: body.openid, participationId: participation.id } as any,
      },
    });

    const synced = await refreshParticipationProgress(participation.id);
    return NextResponse.json({ participation: serializeParticipation(synced) }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
