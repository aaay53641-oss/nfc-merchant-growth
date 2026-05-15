import { NextRequest, NextResponse } from "next/server";

import { handleRouteError, HttpError } from "@/lib/api/errors";
import {
  allianceCouponInclude,
  allianceCouponUpdatePayloadSchema,
  createAuditLog,
  requirePlatformSession,
  serializeAllianceCoupon,
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
    const body = allianceCouponUpdatePayloadSchema.parse(await request.json());
    const existing = await prisma.allianceCoupon.findUnique({
      where: { id: params.id },
      include: allianceCouponInclude,
    });

    if (!existing) {
      throw new HttpError("Alliance coupon not found", 404);
    }

    if (body.partnerId) {
      const partner = await prisma.alliancePartner.findUnique({
        where: { id: body.partnerId },
        select: { id: true },
      });
      if (!partner) {
        throw new HttpError("Alliance partner not found", 404);
      }
    }

    const coupon = await prisma.allianceCoupon.update({
      where: { id: params.id },
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
      action: "platform.alliance.coupon.update",
      actorId: session.userId,
      targetType: "AllianceCoupon",
      targetId: coupon.id,
      detail: { partnerId: coupon.partnerId },
    });

    return NextResponse.json({ coupon: serializeAllianceCoupon(coupon) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePlatformSession();
    const coupon = await prisma.allianceCoupon.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, partnerId: true },
    });

    if (!coupon) {
      throw new HttpError("Alliance coupon not found", 404);
    }

    await prisma.allianceCoupon.delete({ where: { id: params.id } });
    await createAuditLog({
      action: "platform.alliance.coupon.delete",
      actorId: session.userId,
      targetType: "AllianceCoupon",
      targetId: coupon.id,
      detail: { name: coupon.name, partnerId: coupon.partnerId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
