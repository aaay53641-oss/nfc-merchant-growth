import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api/errors";
import {
  platformNfcCardInclude,
  requirePlatformSession,
  serializePlatformNfcCard,
} from "@/lib/api/platform";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePlatformSession();
    const cards = await prisma.nfcCard.findMany({
      include: platformNfcCardInclude,
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({
      cards: cards.map(serializePlatformNfcCard),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
