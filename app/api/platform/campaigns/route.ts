import { CampaignStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { handleRouteError, HttpError } from "@/lib/api/errors";
import {
  platformCampaignInclude,
  requirePlatformSession,
  serializePlatformCampaign,
} from "@/lib/api/platform";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requirePlatformSession();
    const merchantId = request.nextUrl.searchParams.get("merchantId");
    const storeId = request.nextUrl.searchParams.get("storeId");
    const statusParam = request.nextUrl.searchParams.get("status");
    const status = statusParam
      ? Object.values(CampaignStatus).includes(statusParam as CampaignStatus)
        ? (statusParam as CampaignStatus)
        : null
      : undefined;

    if (status === null) {
      throw new HttpError("Invalid campaign status", 400);
    }

    const campaigns = await prisma.campaign.findMany({
      where: {
        merchantId: storeId ?? undefined,
        status,
        store: {
          merchantId: merchantId ?? undefined,
        },
      },
      include: platformCampaignInclude,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      campaigns: campaigns.map(serializePlatformCampaign),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
