import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";

const COOKIE_NAME = "merchant_session";
const MERCHANT_ROLES = new Set(["MERCHANT", "MERCHANT_STAFF"]);
const PLATFORM_ROLE = "PLATFORM";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/platform") && !pathname.startsWith("/platform/login")) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/platform/login", request.url));
    }

    const session = await verifySessionToken(token);
    if (!session) {
      const response = NextResponse.redirect(new URL("/platform/login", request.url));
      response.cookies.delete(COOKIE_NAME);
      return response;
    }

    if (session.role !== PLATFORM_ROLE) {
      return NextResponse.redirect(new URL("/platform/login", request.url));
    }

    const res = NextResponse.next();
    res.headers.set("X-User-Id", session.userId);
    res.headers.set("X-Role", session.role);
    return res;
  }

  // Protect /merchant/* routes except login
  if (pathname.startsWith("/merchant") && !pathname.startsWith("/merchant/login")) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/merchant/login", request.url));
    }

    const session = await verifySessionToken(token);
    if (!session) {
      const response = NextResponse.redirect(new URL("/merchant/login", request.url));
      response.cookies.delete(COOKIE_NAME);
      return response;
    }

    if (!MERCHANT_ROLES.has(session.role) || !session.merchantId) {
      return NextResponse.redirect(new URL("/merchant/login", request.url));
    }

    const res = NextResponse.next();
    res.headers.set("X-User-Id", session.userId);
    res.headers.set("X-Merchant-Id", session.merchantId);
    res.headers.set("X-Role", session.role);
    return res;
  }

  if (
    pathname.startsWith("/api/platform") &&
    !pathname.startsWith("/api/platform/auth/login") &&
    !pathname.startsWith("/api/platform/auth/logout")
  ) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== PLATFORM_ROLE) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const res = NextResponse.next();
    res.headers.set("X-User-Id", session.userId);
    res.headers.set("X-Role", session.role);
    return res;
  }

  // Protect /api/merchant/* routes (authenticated API calls)
  if (pathname.startsWith("/api/merchant")) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!MERCHANT_ROLES.has(session.role) || !session.merchantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const res = NextResponse.next();
    res.headers.set("X-User-Id", session.userId);
    res.headers.set("X-Merchant-Id", session.merchantId);
    res.headers.set("X-Role", session.role);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/merchant/:path*",
    "/platform/:path*",
    "/api/merchant/:path*",
    "/api/platform/:path*",
  ],
};
