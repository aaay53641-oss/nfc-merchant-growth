import { NextResponse } from "next/server";

import { getCampaignAnalytics } from "@/lib/api/analytics";
import { handleRouteError } from "@/lib/api/errors";
import { requirePlatformSession } from "@/lib/api/platform";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    await requirePlatformSession();
    return NextResponse.json(await getCampaignAnalytics(params.id));
  } catch (error) {
    return handleRouteError(error);
  }
}
