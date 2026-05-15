import { ClaimStatus, EventType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logEvent } from "@/lib/engine/events";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
const CODE_EXPIRY_HOURS = 24;

export function generateRedemptionCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

export async function createRedemptionWithCode(input: {
  participationId: string;
  rewardId: string;
}): Promise<{ id: string; code: string; status: ClaimStatus }> {
  const participation = await prisma.participation.findUnique({
    where: { id: input.participationId },
    include: {
      campaign: { include: { tasks: { orderBy: { sortOrder: "asc" } } } },
      submissions: { where: { status: "APPROVED" } },
    },
  });
  if (!participation) throw new Error("Participation not found");

  // Verify all tasks are approved
  const allApproved = participation.campaign.tasks.every((t) =>
    participation.submissions.some((s) => s.taskId === t.id)
  );
  if (!allApproved) throw new Error("Not all tasks are approved");

  // Check existing redemption (idempotent)
  const existing = await prisma.redemption.findFirst({
    where: { participationId: input.participationId, rewardId: input.rewardId },
  });
  if (existing) {
    return { id: existing.id, code: existing.code, status: existing.status as ClaimStatus };
  }

  // Generate unique code
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateRedemptionCode();
    try {
      const redemption = await prisma.redemption.create({
        data: {
          participationId: input.participationId,
          rewardId: input.rewardId,
          code,
          status: ClaimStatus.CLAIMED,
        },
      });
      await logEvent({
        eventType: EventType.reward_claimed,
        userId: undefined,
        campaignId: participation.campaignId,
        metadata: {
          participationId: input.participationId,
          rewardId: input.rewardId,
          code,
        },
      });
      return { id: redemption.id, code, status: ClaimStatus.CLAIMED };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        continue; // Code collision, retry
      }
      throw error;
    }
  }
  throw new Error("Failed to generate unique redemption code after 10 attempts");
}

export async function redeemCode(code: string): Promise<{
  id: string;
  code: string;
  status: ClaimStatus;
  expired: boolean;
}> {
  const redemption = await prisma.redemption.findUnique({
    where: { code },
    include: { participation: true },
  });
  if (!redemption) throw new Error("核销码不存在");

  if (redemption.status === "USED") throw new Error("该核销码已被使用");
  if (redemption.status === "CANCELLED") throw new Error("该核销码已取消");

  // Check expiry
  const expiryTime = new Date(redemption.createdAt);
  expiryTime.setHours(expiryTime.getHours() + CODE_EXPIRY_HOURS);
  if (new Date() > expiryTime) {
    await prisma.redemption.update({
      where: { code },
      data: { status: ClaimStatus.EXPIRED },
    });
    return { id: redemption.id, code, status: ClaimStatus.EXPIRED, expired: true };
  }

  const updated = await prisma.redemption.update({
    where: { code },
    data: { status: ClaimStatus.USED, redeemedAt: new Date() },
  });

  await logEvent({
    eventType: EventType.reward_used,
    campaignId: redemption.participation.campaignId,
    metadata: { code, participationId: redemption.participationId, rewardId: redemption.rewardId },
  });

  return { id: updated.id, code, status: updated.status as ClaimStatus, expired: false };
}

export async function expireStaleRedemptions(): Promise<number> {
  const expiryTime = new Date();
  expiryTime.setHours(expiryTime.getHours() - CODE_EXPIRY_HOURS);

  const result = await prisma.redemption.updateMany({
    where: {
      status: "CLAIMED",
      createdAt: { lt: expiryTime },
    },
    data: { status: ClaimStatus.EXPIRED },
  });

  return result.count;
}

export async function getClaimableRewards(participationId: string) {
  const participation = await prisma.participation.findUnique({
    where: { id: participationId },
    include: {
      campaign: {
        include: {
          tasks: { orderBy: { sortOrder: "asc" } },
          rewards: true,
        },
      },
      submissions: { where: { status: "APPROVED" } },
    },
  });
  if (!participation) throw new Error("Participation not found");

  const allApproved = participation.campaign.tasks.every((t) =>
    participation.submissions.some((s) => s.taskId === t.id)
  );
  if (!allApproved) return [];

  const claimed = await prisma.redemption.findMany({
    where: { participationId },
    select: { rewardId: true },
  });
  const claimedIds = new Set(claimed.map((r) => r.rewardId));

  return participation.campaign.rewards.filter((r) => !claimedIds.has(r.id));
}
