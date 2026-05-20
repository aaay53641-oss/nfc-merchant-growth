import { EventType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type EventMetadata = Prisma.InputJsonObject;

interface EventInput {
  eventType: EventType;
  userId?: string;
  campaignId?: string;
  nfcCardId?: string;
  metadata?: EventMetadata;
}

export async function logEvent(input: EventInput): Promise<void> {
  try {
    await prisma.event.create({
      data: {
        eventType: input.eventType,
        userId: input.userId ?? null,
        campaignId: input.campaignId ?? null,
        nfcCardId: input.nfcCardId ?? null,
        metadata: input.metadata ?? {},
      },
    });
  } catch {
    // Event logging should never break the main flow
    console.warn("[engine] failed to log event:", input.eventType);
  }
}

export async function logNFCTap(nfcCardId: string, campaignId?: string): Promise<void> {
  const nfcCard = await prisma.nfcCard.findUnique({ where: { id: nfcCardId } });
  await logEvent({
    eventType: EventType.nfc_tap,
    nfcCardId,
    campaignId: campaignId ?? nfcCard?.campaignId ?? undefined,
    metadata: { cardCode: nfcCard?.code },
  });
}

export async function logPageView(userId?: string, campaignId?: string): Promise<void> {
  await logEvent({ eventType: EventType.page_view, userId, campaignId });
}

export async function logRuleView(userId?: string, campaignId?: string): Promise<void> {
  await logEvent({ eventType: EventType.rule_view, userId, campaignId });
}

export async function logPlatformJump(
  userId?: string,
  campaignId?: string,
  platform?: string
): Promise<void> {
  await logEvent({
    eventType: EventType.platform_jump,
    userId,
    campaignId,
    metadata: { platform },
  });
}

export async function logAIGenerate(
  userId: string,
  campaignId?: string,
  platform?: string
): Promise<void> {
  await logEvent({
    eventType: EventType.ai_generate,
    userId,
    campaignId,
    metadata: { platform },
  });
}
