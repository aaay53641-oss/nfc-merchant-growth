import { NextRequest, NextResponse } from "next/server";
import { getParticipationTaskStates, getTaskStates } from "@/lib/engine";
import { resolveCampaignPublicId } from "@/lib/api/h5";

export async function GET(request: NextRequest) {
  const campaignId = request.nextUrl.searchParams.get("campaignId");
  const participationId = request.nextUrl.searchParams.get("participationId");

  if (!campaignId && !participationId) {
    return NextResponse.json({ error: "campaignId or participationId required" }, { status: 400 });
  }

  try {
    if (participationId) {
      const state = await getParticipationTaskStates(participationId);
      return NextResponse.json(state);
    }

    const resolvedCampaignId = await resolveCampaignPublicId(campaignId!);
    const tasks = await getTaskStates(resolvedCampaignId);
    return NextResponse.json({
      campaignId: resolvedCampaignId,
      tasks: tasks.map((t) => ({
        id: t.id,
        sortOrder: t.sortOrder,
        status: t.status,
        title: t.title,
        rewardName: t.reward?.name ?? null,
        unlockRule: t.sortOrder === 1
          ? "NFC_TAP"
          : `PREVIOUS_APPROVED (sortOrder=${t.sortOrder - 1})`,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
