import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /merchant/* routes except login
  if (pathname.startsWith("/merchant") && !pathname.startsWith("/merchant/login")) {
    const token = request.cookies.get("merchant_session")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/merchant/login", request.url));
    }

    const session = await verifySessionToken(token);
    if (!session) {
      const response = NextResponse.redirect(new URL("/merchant/login", request.url));
      response.cookies.delete("merchant_session");
      return response;
    }

    // Allow access — set user info in headers for downstream
    const res = NextResponse.next();
    res.headers.set("X-User-Id", session.userId);
    res.headers.set("X-Merchant-Id", session.merchantId);
    return res;
  }

  // Protect /api/merchant/* routes (authenticated API calls)
  if (pathname.startsWith("/api/merchant")) {
    const token = request.cookies.get("merchant_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const res = NextResponse.next();
    res.headers.set("X-User-Id", session.userId);
    res.headers.set("X-Merchant-Id", session.merchantId);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/merchant/:path*", "/api/merchant/:path*"],
};
