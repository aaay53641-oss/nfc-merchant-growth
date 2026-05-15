import { NextRequest, NextResponse } from "next/server";

import { handleRouteError, HttpError } from "@/lib/api/errors";
import { aiCopyRequestSchema, generateAICopy } from "@/lib/ai/copy";

export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 3;
const buckets = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function enforceRateLimit(ip: string) {
  const now = Date.now();
  const current = buckets.get(ip);

  if (!current || current.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  if (current.count >= MAX_REQUESTS) {
    throw new HttpError("Too many requests", 429, {
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
    });
  }

  current.count += 1;
}

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(getClientIp(request));
    const body = aiCopyRequestSchema.parse(await request.json());
    const copy = await generateAICopy(body);

    return NextResponse.json(copy);
  } catch (error) {
    return handleRouteError(error);
  }
}
