import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const redemption = await prisma.redemption.findUnique({
      where: { code },
      include: {
        participation: true,
        reward: { include: { campaign: { include: { store: true } } } },
      },
    });
    if (!redemption) return NextResponse.json({ error: "核销码不存在" }, { status: 404 });
    if (redemption.reward.campaign.store.merchantId !== session.merchantId) {
      return NextResponse.json({ error: "无权查看此核销码" }, { status: 403 });
    }
    return NextResponse.json({
      code: redemption.code,
      status: redemption.status,
      userName: redemption.participation.openid,
      rewardName: redemption.reward.name,
      rewardDescription: redemption.reward.description,
      createdAt: redemption.createdAt.toISOString(),
      redeemedAt: redemption.redeemedAt?.toISOString() ?? null,
    });
  }

  const redemptions = await prisma.redemption.findMany({
    where: {
      reward: { campaign: { store: { merchantId: session.merchantId } } },
    },
    include: {
      participation: true,
      reward: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(
    redemptions.map((r) => ({
      code: r.code,
      status: r.status,
      userName: r.participation.openid,
      rewardName: r.reward.name,
      rewardDescription: r.reward.description,
      createdAt: r.createdAt.toISOString(),
      redeemedAt: r.redeemedAt?.toISOString() ?? null,
    }))
  );
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await request.json();

  const redemption = await prisma.redemption.findUnique({
    where: { code },
    include: { reward: { include: { campaign: { include: { store: true } } } } },
  });
  if (!redemption) return NextResponse.json({ error: "核销码不存在" }, { status: 404 });
  if (redemption.reward.campaign.store.merchantId !== session.merchantId) {
    return NextResponse.json({ error: "无权核销" }, { status: 403 });
  }
  if (redemption.status === "USED") {
    return NextResponse.json({ error: "该核销码已被使用" }, { status: 409 });
  }

  const updated = await prisma.redemption.update({
    where: { code },
    data: { status: "USED", redeemedAt: new Date() },
  });

  return NextResponse.json({
    success: true,
    status: updated.status,
    redeemedAt: updated.redeemedAt?.toISOString() ?? null,
  });
}
