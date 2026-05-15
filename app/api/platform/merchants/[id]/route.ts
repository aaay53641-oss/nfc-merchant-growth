import { NextRequest, NextResponse } from "next/server";

import { handleRouteError, HttpError } from "@/lib/api/errors";
import {
  createAuditLog,
  merchantReviewSchema,
  platformMerchantInclude,
  requirePlatformSession,
  serializePlatformMerchant,
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
    const body = merchantReviewSchema.parse(await request.json());
    const existing = await prisma.merchant.findUnique({
      where: { id: params.id },
      include: platformMerchantInclude,
    });

    if (!existing) {
      throw new HttpError("Merchant not found", 404);
    }

    const merchant = await prisma.merchant.update({
      where: { id: params.id },
      data: {
        status: body.status,
        reviewNote: body.status === "REJECTED" ? body.reviewNote : null,
        reviewedAt: new Date(),
        reviewedBy: session.userId,
      },
      include: platformMerchantInclude,
    });

    await createAuditLog({
      action: "platform.merchant.review",
      actorId: session.userId,
      targetType: "Merchant",
      targetId: merchant.id,
      detail: {
        beforeStatus: existing.status,
        afterStatus: merchant.status,
        reviewNote: merchant.reviewNote,
      },
    });

    return NextResponse.json({ merchant: serializePlatformMerchant(merchant) });
  } catch (error) {
    return handleRouteError(error);
  }
}
