import { TaskStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { handleRouteError, HttpError } from "@/lib/api/errors";
import {
  assertCampaignBelongsToMerchant,
  assertStoreBelongsToMerchant,
  campaignInclude,
  campaignPayloadSchema,
  resolveMerchantScope,
  serializeCampaign,
} from "@/lib/api/merchant";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CampaignRouteParams = {
  params: {
    id: string;
  };
};

export async function PATCH(request: NextRequest, { params }: CampaignRouteParams) {
  try {
    const merchant = await resolveMerchantScope(request);
    const existingCampaign = await assertCampaignBelongsToMerchant(params.id, merchant.id);
    const body = campaignPayloadSchema.parse(await request.json());

    await assertStoreBelongsToMerchant(body.storeId, merchant.id);

    const campaign = await prisma.$transaction(async (tx) => {
      await tx.campaign.update({
        where: { id: existingCampaign.id },
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

      const tasksBySortOrder = new Map(
        existingCampaign.tasks.map((task) => [task.sortOrder, task])
      );

      for (let index = 0; index < body.tasks.length; index += 1) {
        const task = body.tasks[index];
        const sortOrder = index + 1;
        const existingTask = tasksBySortOrder.get(sortOrder);
        let rewardId = existingTask?.rewardId ?? null;

        if (task.rewardId) {
          const reward = await tx.reward.findFirst({
            where: {
              id: task.rewardId,
              campaignId: existingCampaign.id,
            },
          });

          if (!reward) {
            throw new HttpError("Reward does not belong to campaign", 400);
          }

          rewardId = reward.id;
        }

        if (task.reward) {
          if (rewardId) {
            await tx.reward.update({
              where: { id: rewardId },
              data: {
                type: task.reward.type,
                name: task.reward.name,
                description: task.reward.description,
                quantity: task.reward.quantity,
                validFrom: task.reward.validFrom,
                validUntil: task.reward.validUntil,
              },
            });
          } else {
            const reward = await tx.reward.create({
              data: {
                campaignId: existingCampaign.id,
                type: task.reward.type,
                name: task.reward.name,
                description: task.reward.description,
                quantity: task.reward.quantity,
                validFrom: task.reward.validFrom,
                validUntil: task.reward.validUntil,
              },
            });

            rewardId = reward.id;
          }
        }

        if (existingTask) {
          await tx.campaignTask.update({
            where: { id: existingTask.id },
            data: {
              taskType: task.taskType,
              title: task.title,
              description: task.description,
              completionRule: task.completionRule,
              verifyType: task.verifyType,
              rewardId,
            },
          });
        } else {
          await tx.campaignTask.create({
            data: {
              campaignId: existingCampaign.id,
              taskType: task.taskType,
              title: task.title,
              description: task.description,
              completionRule: task.completionRule,
              verifyType: task.verifyType,
              sortOrder,
              rewardId,
              status: sortOrder === 1 ? TaskStatus.AVAILABLE : TaskStatus.LOCKED,
            },
          });
        }
      }

      const hydratedCampaign = await tx.campaign.findUnique({
        where: { id: existingCampaign.id },
        include: campaignInclude,
      });

      if (!hydratedCampaign) {
        throw new HttpError("Campaign not found after update", 500);
      }

      return hydratedCampaign;
    });

    return NextResponse.json({ campaign: serializeCampaign(campaign) });
  } catch (error) {
    return handleRouteError(error);
  }
}
