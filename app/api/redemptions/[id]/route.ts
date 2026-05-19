import { HttpError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { sprintError, sprintSuccess, visualCodeCells } from "@/lib/api/sprint10";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: { id: string };
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const redemption = await prisma.redemption.findUnique({
      where: { id: params.id },
      include: {
        participation: true,
        reward: {
          include: {
            campaign: {
              include: {
                store: true,
              },
            },
          },
        },
      },
    });

    if (!redemption) throw new HttpError("Redemption not found", 404);

    return sprintSuccess({
      id: redemption.id,
      code: redemption.code,
      visualCodeCells: await visualCodeCells(redemption.code),
      status: redemption.status,
      redeemedAt: redemption.redeemedAt?.toISOString() ?? null,
      createdAt: redemption.createdAt.toISOString(),
      reward: {
        id: redemption.reward.id,
        name: redemption.reward.name,
        description: redemption.reward.description,
        validFrom: redemption.reward.validFrom?.toISOString() ?? null,
        validUntil: redemption.reward.validUntil?.toISOString() ?? null,
      },
      store: {
        id: redemption.reward.campaign.store.id,
        name: redemption.reward.campaign.store.name,
        address: redemption.reward.campaign.store.address,
        phone: redemption.reward.campaign.store.phone,
      },
      participation: {
        id: redemption.participation.id,
        openid: redemption.participation.openid,
      },
    });
  } catch (error) {
    return sprintError(error);
  }
}
