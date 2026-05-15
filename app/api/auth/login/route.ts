import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = loginSchema.parse(await request.json());

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: {
        merchant: { select: { id: true } },
      },
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
    }

    const valid = await verifyPassword(body.password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
    }

    if (user.role !== "MERCHANT" && user.role !== "MERCHANT_STAFF") {
      return NextResponse.json({ error: "无商家后台权限" }, { status: 403 });
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email ?? "",
      role: user.role,
      merchantId: user.merchant?.id ?? "",
    });

    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
      },
      merchantId: user.merchant?.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "请输入有效的邮箱和密码" }, { status: 400 });
    }
    console.error("[auth] login error:", error);
    return NextResponse.json({ error: "登录失败，请重试" }, { status: 500 });
  }
}
