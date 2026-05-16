import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export type AllianceCouponDto = {
  id: string;
  name: string;
  description: string | null;
  discount: number;
  partnerName: string;
};

export async function GET() {
  try {
    const now = new Date();
    const coupons = await prisma.allianceCoupon.findMany({
      where: {
        validFrom: { lte: now },
        validUntil: { gte: now },
        partner: {
          status: "ACTIVE",
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        partner: true,
      },
    });

    return NextResponse.json({
      coupons: coupons.map<AllianceCouponDto>((coupon) => ({
        id: coupon.id,
        name: coupon.name,
        description: coupon.description,
        discount: coupon.discount,
        partnerName: coupon.partner.name,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
