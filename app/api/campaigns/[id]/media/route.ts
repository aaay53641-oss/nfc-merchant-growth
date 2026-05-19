import { NextRequest } from "next/server";
import { MediaType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { resolveCampaignForMedia, serializeMedia, sprintError, sprintSuccess } from "@/lib/api/sprint10";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: { id: string };
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const campaignId = await resolveCampaignForMedia(params.id);
    const step = request.nextUrl.searchParams.get("step");
    const platform = request.nextUrl.searchParams.get("platform");
    const mediaType = request.nextUrl.searchParams.get("mediaType");

    const media = await prisma.campaignMedia.findMany({
      where: {
        campaignId,
        enabled: true,
        allowUserUse: true,
        ...(step === "2" ? { step2Enabled: true } : {}),
        ...(step === "3" ? { step3Enabled: true } : {}),
        ...(platform ? { OR: [{ platform }, { platform: null }] } : {}),
        ...(mediaType === "IMAGE" || mediaType === "VIDEO"
          ? { mediaType: mediaType as MediaType }
          : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return sprintSuccess({ media: media.map(serializeMedia) });
  } catch (error) {
    return sprintError(error);
  }
}
