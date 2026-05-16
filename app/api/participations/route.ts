import { NextRequest, NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api/errors";
import {
  createParticipationSchema,
  getActiveCampaignOrThrow,
  getOrCreateUserForOpenid,
  refreshParticipationProgress,
  serializeParticipation,
} from "@/lib/api/h5";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = createParticipationSchema.parse(await request.json());

    await getActiveCampaignOrThrow(body.campaignId);
    await getOrCreateUserForOpenid(body.openid);

    const participation = await prisma.participation.upsert({
      where: {
        openid_campaignId: {
          openid: body.openid,
          campaignId: body.campaignId,
        },
      },
      create: {
        openid: body.openid,
        campaignId: body.campaignId,
      },
      update: {},
    });
    const syncedParticipation = await refreshParticipationProgress(participation.id);

    return NextResponse.json({
      participation: serializeParticipation(syncedParticipation),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
