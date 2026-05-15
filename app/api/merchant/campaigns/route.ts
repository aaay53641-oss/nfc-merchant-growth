import { TaskStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { handleRouteError, HttpError } from "@/lib/api/errors";
import {
  assertStoreBelongsToMerchant,
  campaignInclude,
  campaignPayloadSchema,
  listMerchantCampaigns,
  resolveMerchantScope,
  serializeCampaign,
} from "@/lib/api/merchant";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const merchant = await resolveMerchantScope(request);
    const storeId = request.nextUrl.searchParams.get("storeId");
    const campaigns = await listMerchantCampaigns({
      merchantId: merchant.id,
      storeId,
    });

    return NextResponse.json({
      merchant,
      campaigns: campaigns.map(serializeCampaign),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const merchant = await resolveMerchantScope(request);
    const body = campaignPayloadSchema.parse(await request.json());

    await assertStoreBelongsToMerchant(body.storeId, merchant.id);

    const campaign = await prisma.$transaction(async (tx) => {
      const createdCampaign = await tx.campaign.create({
        data: {
          title: body.title,
          description: body.description,
          coverImage: body.coverImage,
          startDate: body.startDate,
          endDate: body.endDate,
          status: body.status,
          merchantId: body.storeId,
        },
      });

      for (let index = 0; index < body.tasks.length; index += 1) {
        const task = body.tasks[index];
        if (task.rewardId) {
          throw new HttpError(
            "New campaign tasks must create rewards inline instead of linking existing rewards",
            400
          );
        }

        const reward = task.reward
          ? await tx.reward.create({
              data: {
                campaignId: createdCampaign.id,
                type: task.reward.type,
                name: task.reward.name,
                description: task.reward.description,
                quantity: task.reward.quantity,
                validFrom: task.reward.validFrom,
                validUntil: task.reward.validUntil,
              },
            })
          : null;

        await tx.campaignTask.create({
          data: {
            campaignId: createdCampaign.id,
            taskType: task.taskType,
            title: task.title,
            description: task.description,
            completionRule: task.completionRule,
            verifyType: task.verifyType,
            sortOrder: index + 1,
            rewardId: reward?.id,
            status: index === 0 ? TaskStatus.AVAILABLE : TaskStatus.LOCKED,
          },
        });
      }

      const hydratedCampaign = await tx.campaign.findUnique({
        where: { id: createdCampaign.id },
        include: campaignInclude,
      });

      if (!hydratedCampaign) {
        throw new HttpError("Campaign not found after creation", 500);
      }

      return hydratedCampaign;
    });

    return NextResponse.json({ campaign: serializeCampaign(campaign) }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
