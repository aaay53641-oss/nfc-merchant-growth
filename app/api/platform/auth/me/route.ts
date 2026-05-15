import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api/errors";
import { requirePlatformSession, serializePlatformSession } from "@/lib/api/platform";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requirePlatformSession();
    return NextResponse.json(serializePlatformSession(session));
  } catch (error) {
    return handleRouteError(error);
  }
}
