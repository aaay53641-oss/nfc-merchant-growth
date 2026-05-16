import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const merchant = session.merchantId
    ? await prisma.merchant.findUnique({
        where: { id: session.merchantId },
        select: { id: true, name: true },
      })
    : null;

  return NextResponse.json({
    user: {
      userId: session.userId,
      email: session.email,
      role: session.role,
      merchantId: session.merchantId,
      merchantName: merchant?.name ?? null,
    },
    merchant,
  });
}
