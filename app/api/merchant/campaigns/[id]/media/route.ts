import { HttpError } from "@/lib/api/errors";
import { resolveMerchantScope } from "@/lib/api/merchant";
import {
  assertMerchantCampaign,
  mediaPayloadSchema,
  serializeMedia,
  sprintError,
  sprintSuccess,
} from "@/lib/api/sprint10";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: { id: string };
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const merchant = await resolveMerchantScope(request);
    await assertMerchantCampaign(params.id, merchant.id);

    const url = new URL(request.url);
    const step = url.searchParams.get("step");
    const media = await prisma.campaignMedia.findMany({
      where: {
        campaignId: params.id,
        ...(step === "2" ? { step2Enabled: true } : {}),
        ...(step === "3" ? { step3Enabled: true } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return sprintSuccess({ media: media.map(serializeMedia) });
  } catch (error) {
    return sprintError(error);
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const merchant = await resolveMerchantScope(request);
    await assertMerchantCampaign(params.id, merchant.id);
    const body = mediaPayloadSchema.parse(await request.json());
    const media = await prisma.campaignMedia.create({
      data: {
        campaignId: params.id,
        url: body.url,
        mediaType: body.mediaType,
        category: body.category,
        platform: body.platform,
        dishName: body.dishName,
        title: body.title,
        tags: body.tags,
        description: body.description,
        allowUserUse: body.allowUserUse,
        enabled: body.enabled,
        sortOrder: body.sortOrder,
        step2Enabled: body.step2Enabled,
        step3Enabled: body.step3Enabled,
      },
    });

    return sprintSuccess({ media: serializeMedia(media) }, 201);
  } catch (error) {
    return sprintError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const merchant = await resolveMerchantScope(request);
    await assertMerchantCampaign(params.id, merchant.id);
    const body = mediaPayloadSchema.parse(await request.json());
    if (!body.id) throw new HttpError("Media id is required", 400);

    const existing = await prisma.campaignMedia.findFirst({
      where: { id: body.id, campaignId: params.id },
    });
    if (!existing) throw new HttpError("Media not found", 404);

    const media = await prisma.campaignMedia.update({
      where: { id: body.id },
      data: {
        url: body.url,
        mediaType: body.mediaType,
        category: body.category,
        platform: body.platform,
        dishName: body.dishName,
        title: body.title,
        tags: body.tags,
        description: body.description,
        allowUserUse: body.allowUserUse,
        enabled: body.enabled,
        sortOrder: body.sortOrder,
        step2Enabled: body.step2Enabled,
        step3Enabled: body.step3Enabled,
      },
    });

    return sprintSuccess({ media: serializeMedia(media) });
  } catch (error) {
    return sprintError(error);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const merchant = await resolveMerchantScope(request);
    await assertMerchantCampaign(params.id, merchant.id);
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) throw new HttpError("Media id is required", 400);

    const existing = await prisma.campaignMedia.findFirst({
      where: { id, campaignId: params.id },
    });
    if (!existing) throw new HttpError("Media not found", 404);

    await prisma.campaignMedia.delete({ where: { id } });
    return sprintSuccess({ id });
  } catch (error) {
    return sprintError(error);
  }
}
