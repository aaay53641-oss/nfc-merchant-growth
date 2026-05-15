import { NextRequest, NextResponse } from "next/server";
import { TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const campaignId = request.nextUrl.searchParams.get("campaignId");
  const participationId = request.nextUrl.searchParams.get("participationId");

  if (!campaignId && !participationId) {
    return NextResponse.json({ error: "campaignId or participationId required" }, { status: 400 });
  }

  if (participationId) {
    const participation = await prisma.participation.findUnique({
      where: { id: participationId },
      include: {
        campaign: {
          include: {
            tasks: {
              orderBy: { sortOrder: "asc" },
              include: { submissions: { orderBy: { submittedAt: "desc" }, take: 1 } },
            },
          },
        },
      },
    });
    if (!participation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      participationId: participation.id,
      currentTask: participation.currentTask,
      tasks: participation.campaign.tasks.map((t) => ({
        id: t.id,
        sortOrder: t.sortOrder,
        status: t.status,
        title: t.title,
        latestSubmission: t.submissions[0] ?? null,
        rewardName: t.rewardId ? t.rewardId : null, // We'd need to do a join for the name
      })),
    });
  }

  // By campaignId only — return all tasks
  const tasks = await prisma.campaignTask.findMany({
    where: { campaignId: campaignId! },
    orderBy: { sortOrder: "asc" },
    include: { reward: { select: { name: true } } },
  });

  return NextResponse.json({
    campaignId,
    tasks: tasks.map((t) => ({
      id: t.id,
      sortOrder: t.sortOrder,
      status: t.status as TaskStatus,
      title: t.title,
      rewardName: t.reward?.name ?? null,
      unlockRule: t.sortOrder === 1
        ? "NFC_TAP"
        : `PREVIOUS_APPROVED (sortOrder=${t.sortOrder - 1})`,
    })),
  });
}
