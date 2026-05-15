import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api/errors";
import {
  allianceCouponInclude,
  alliancePartnerInclude,
  requirePlatformSession,
  serializeAllianceCoupon,
  serializeAlliancePartner,
} from "@/lib/api/platform";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePlatformSession();
    const [partners, coupons, merchants] = await Promise.all([
      prisma.alliancePartner.findMany({
        include: alliancePartnerInclude,
        orderBy: { createdAt: "desc" },
      }),
      prisma.allianceCoupon.findMany({
        include: allianceCouponInclude,
        orderBy: { createdAt: "desc" },
      }),
      prisma.merchant.findMany({
        select: { id: true, name: true, status: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      partners: partners.map(serializeAlliancePartner),
      coupons: coupons.map(serializeAllianceCoupon),
      merchants,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
