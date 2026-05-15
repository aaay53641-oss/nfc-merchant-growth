import { NextRequest, NextResponse } from "next/server";

import { handleRouteError, HttpError } from "@/lib/api/errors";
import {
  alliancePartnerInclude,
  alliancePartnerPayloadSchema,
  createAuditLog,
  requirePlatformSession,
  serializeAlliancePartner,
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
    const body = alliancePartnerPayloadSchema.partial().parse(await request.json());
    const existing = await prisma.alliancePartner.findUnique({
      where: { id: params.id },
      include: alliancePartnerInclude,
    });

    if (!existing) {
      throw new HttpError("Alliance partner not found", 404);
    }

    if (body.merchantId) {
      const merchant = await prisma.merchant.findUnique({
        where: { id: body.merchantId },
        select: { id: true },
      });
      if (!merchant) {
        throw new HttpError("Merchant not found", 404);
      }
    }

    const partner = await prisma.alliancePartner.update({
      where: { id: params.id },
      data: {
        merchantId: body.merchantId,
        name: body.name,
        type: body.type,
        contactName: body.contactName,
        contactPhone: body.contactPhone,
        status: body.status,
      },
      include: alliancePartnerInclude,
    });

    await createAuditLog({
      action: "platform.alliance.partner.update",
      actorId: session.userId,
      targetType: "AlliancePartner",
      targetId: partner.id,
      detail: { beforeStatus: existing.status, afterStatus: partner.status },
    });

    return NextResponse.json({ partner: serializeAlliancePartner(partner) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePlatformSession();
    const partner = await prisma.alliancePartner.findUnique({
      where: { id: params.id },
      include: { _count: { select: { AllianceCoupon: true } } },
    });

    if (!partner) {
      throw new HttpError("Alliance partner not found", 404);
    }

    if (partner._count.AllianceCoupon > 0) {
      throw new HttpError("Alliance partner has coupons and cannot be deleted", 409, {
        coupons: partner._count.AllianceCoupon,
      });
    }

    await prisma.alliancePartner.delete({ where: { id: params.id } });
    await createAuditLog({
      action: "platform.alliance.partner.delete",
      actorId: session.userId,
      targetType: "AlliancePartner",
      targetId: params.id,
      detail: { name: partner.name },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
