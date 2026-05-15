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

export async function POST(request: NextRequest) {
  try {
    const session = await requirePlatformSession();
    const body = alliancePartnerPayloadSchema.parse(await request.json());
    const merchant = await prisma.merchant.findUnique({
      where: { id: body.merchantId },
      select: { id: true },
    });

    if (!merchant) {
      throw new HttpError("Merchant not found", 404);
    }

    const partner = await prisma.alliancePartner.create({
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
      action: "platform.alliance.partner.create",
      actorId: session.userId,
      targetType: "AlliancePartner",
      targetId: partner.id,
      detail: { merchantId: partner.merchantId, status: partner.status },
    });

    return NextResponse.json({ partner: serializeAlliancePartner(partner) }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
