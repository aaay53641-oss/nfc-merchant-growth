import { NextRequest, NextResponse } from "next/server";

import { handleRouteError, HttpError } from "@/lib/api/errors";
import {
  allianceCouponInclude,
  allianceCouponPayloadSchema,
  createAuditLog,
  requirePlatformSession,
  serializeAllianceCoupon,
} from "@/lib/api/platform";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await requirePlatformSession();
    const body = allianceCouponPayloadSchema.parse(await request.json());
    const partner = await prisma.alliancePartner.findUnique({
      where: { id: body.partnerId },
      select: { id: true },
    });

    if (!partner) {
      throw new HttpError("Alliance partner not found", 404);
    }

    const coupon = await prisma.allianceCoupon.create({
      data: {
        partnerId: body.partnerId,
        name: body.name,
        description: body.description,
        discount: body.discount,
        validFrom: body.validFrom,
        validUntil: body.validUntil,
      },
      include: allianceCouponInclude,
    });

    await createAuditLog({
      action: "platform.alliance.coupon.create",
      actorId: session.userId,
      targetType: "AllianceCoupon",
      targetId: coupon.id,
      detail: { partnerId: coupon.partnerId },
    });

    return NextResponse.json({ coupon: serializeAllianceCoupon(coupon) }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
