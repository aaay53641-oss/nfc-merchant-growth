import { Status } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { handleRouteError, HttpError } from "@/lib/api/errors";
import {
  platformMerchantInclude,
  requirePlatformSession,
  serializePlatformMerchant,
} from "@/lib/api/platform";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requirePlatformSession();
    const statusParam = request.nextUrl.searchParams.get("status");
    const status = statusParam
      ? Object.values(Status).includes(statusParam as Status)
        ? (statusParam as Status)
        : null
      : undefined;

    if (status === null) {
      throw new HttpError("Invalid merchant status", 400);
    }

    const merchants = await prisma.merchant.findMany({
      where: status ? { status } : undefined,
      include: platformMerchantInclude,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      merchants: merchants.map(serializePlatformMerchant),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
