import { resolveMerchantScope } from "@/lib/api/merchant";
import {
  assertMerchantCampaign,
  lotterySettingsSchema,
  sprintError,
  sprintSuccess,
} from "@/lib/api/sprint10";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: { id: string };
};

function serializeSettings(campaign: {
  id: string;
  lotteryDailyQuota: number;
  lotteryDrawTime: string | null;
  lotteryMinScore: number;
  lotteryActive: boolean;
}) {
  return {
    campaignId: campaign.id,
    lotteryDailyQuota: campaign.lotteryDailyQuota,
    lotteryDrawTime: campaign.lotteryDrawTime,
    lotteryMinScore: campaign.lotteryMinScore,
    lotteryActive: campaign.lotteryActive,
  };
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const merchant = await resolveMerchantScope(request);
    const campaign = await assertMerchantCampaign(params.id, merchant.id);
    return sprintSuccess({ settings: serializeSettings(campaign) });
  } catch (error) {
    return sprintError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const merchant = await resolveMerchantScope(request);
    await assertMerchantCampaign(params.id, merchant.id);
    const body = lotterySettingsSchema.parse(await request.json());
    const campaign = await prisma.campaign.update({
      where: { id: params.id },
      data: body,
      select: {
        id: true,
        lotteryDailyQuota: true,
        lotteryDrawTime: true,
        lotteryMinScore: true,
        lotteryActive: true,
      },
    });

    return sprintSuccess({ settings: serializeSettings(campaign) });
  } catch (error) {
    return sprintError(error);
  }
}
