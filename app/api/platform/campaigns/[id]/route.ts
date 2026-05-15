import { NextRequest, NextResponse } from "next/server";

import { handleRouteError, HttpError } from "@/lib/api/errors";
import {
  createAuditLog,
  platformCampaignInclude,
  platformCampaignPatchSchema,
  requirePlatformSession,
  serializePlatformCampaign,
} from "@/lib/api/platform";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: {
    id: string;
  };
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePlatformSession();
    const body = platformCampaignPatchSchema.parse(await request.json());
    const existing = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: platformCampaignInclude,
    });

    if (!existing) {
      throw new HttpError("Campaign not found", 404);
    }

    const campaign = await prisma.campaign.update({
      where: { id: params.id },
      data: { status: body.status },
      include: platformCampaignInclude,
    });

    await createAuditLog({
      action: "platform.campaign.status.update",
      actorId: session.userId,
      targetType: "Campaign",
      targetId: campaign.id,
      detail: {
        beforeStatus: existing.status,
        afterStatus: campaign.status,
      },
    });

    return NextResponse.json({ campaign: serializePlatformCampaign(campaign) });
  } catch (error) {
    return handleRouteError(error);
  }
}
