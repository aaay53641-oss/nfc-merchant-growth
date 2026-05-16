import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api/errors";
import {
  platformStoreInclude,
  requirePlatformSession,
  serializePlatformStore,
} from "@/lib/api/platform";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePlatformSession();
    const stores = await prisma.store.findMany({
      include: platformStoreInclude,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      stores: stores.map(serializePlatformStore),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
