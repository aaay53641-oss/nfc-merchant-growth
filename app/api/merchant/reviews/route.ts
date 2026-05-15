import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const filter = request.nextUrl.searchParams.get("filter") ?? "pending";
  const statusFilter = filter === "pending" ? ["SUBMITTED" as const] : ["APPROVED" as const, "REJECTED" as const];

  const submissions = await prisma.taskSubmission.findMany({
    where: {
      status: { in: statusFilter },
      task: {
        campaign: {
          store: { merchantId: session.merchantId },
        },
      },
    },
    include: {
      user: { select: { nickname: true } },
      task: { select: { title: true } },
    },
    orderBy: { submittedAt: "desc" },
    take: 50,
  });

  return NextResponse.json(
    submissions.map((s) => ({
      id: s.id,
      userName: s.user.nickname ?? "未知用户",
      taskTitle: s.task.title,
      content: s.content,
      imageUrls: s.imageUrls,
      platformLink: s.platformLink,
      status: s.status,
      submittedAt: s.submittedAt.toISOString(),
    }))
  );
}
