import { NextRequest, NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api/errors";
import { getMerchantAdvisor } from "@/lib/api/merchant-advisor";
import { resolveMerchantScope } from "@/lib/api/merchant";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const scope = await resolveMerchantScope(request);
    const includeSuggestions =
      request.nextUrl.searchParams.get("includeSuggestions") !== "false";
    const payload = await getMerchantAdvisor({
      merchantId: scope.id,
      includeSuggestions,
    });

    return NextResponse.json(payload);
  } catch (error) {
    return handleRouteError(error);
  }
}
