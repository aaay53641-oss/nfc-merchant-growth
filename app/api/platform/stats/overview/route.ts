import { NextResponse } from "next/server";

import { getPlatformOverview } from "@/lib/api/analytics";
import { handleRouteError } from "@/lib/api/errors";
import { requirePlatformSession } from "@/lib/api/platform";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePlatformSession();
    return NextResponse.json(await getPlatformOverview());
  } catch (error) {
    return handleRouteError(error);
  }
}
