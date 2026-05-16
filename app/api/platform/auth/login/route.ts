import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { handleRouteError, HttpError } from "@/lib/api/errors";
import { platformLoginSchema, serializePlatformSession } from "@/lib/api/platform";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = platformLoginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      select: {
        id: true,
        email: true,
        nickname: true,
        password: true,
        role: true,
      },
    });

    if (!user?.password) {
      throw new HttpError("邮箱或密码错误", 401);
    }

    const validPassword = await verifyPassword(body.password, user.password);
    if (!validPassword) {
      throw new HttpError("邮箱或密码错误", 401);
    }

    if (user.role !== Role.PLATFORM) {
      throw new HttpError("无平台后台权限", 403);
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email ?? "",
      role: user.role,
      merchantId: "",
    });
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      ...serializePlatformSession({
        userId: user.id,
        email: user.email ?? "",
        role: user.role,
        merchantId: "",
      }),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
