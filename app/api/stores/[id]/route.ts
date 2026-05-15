import { NextRequest, NextResponse } from "next/server";

import { handleRouteError, HttpError } from "@/lib/api/errors";
import {
  assertStoreBelongsToMerchant,
  resolveMerchantScope,
  serializeStore,
  storePayloadSchema,
  storeWithCountsInclude,
} from "@/lib/api/merchant";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type StoreRouteParams = {
  params: {
    id: string;
  };
};

export async function PATCH(request: NextRequest, { params }: StoreRouteParams) {
  try {
    const merchant = await resolveMerchantScope(request);
    await assertStoreBelongsToMerchant(params.id, merchant.id);
    const body = storePayloadSchema.parse(await request.json());
    const store = await prisma.store.update({
      where: { id: params.id },
      data: {
        name: body.name,
        address: body.address,
        phone: body.phone,
      },
      include: storeWithCountsInclude,
    });

    return NextResponse.json({ store: serializeStore(store) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: StoreRouteParams) {
  try {
    const merchant = await resolveMerchantScope(request);
    await assertStoreBelongsToMerchant(params.id, merchant.id);
    const store = await prisma.store.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            campaigns: true,
            nfcCards: true,
            staff: true,
            CampaignStore: true,
          },
        },
      },
    });

    if (!store) {
      throw new HttpError("Store not found", 404);
    }

    const blockers = {
      campaigns: store._count.campaigns,
      nfcCards: store._count.nfcCards,
      staff: store._count.staff,
      campaignLinks: store._count.CampaignStore,
    };
    const hasBlockers = Object.values(blockers).some((count) => count > 0);

    if (hasBlockers) {
      throw new HttpError("Store has related records and cannot be deleted", 409, blockers);
    }

    await prisma.store.delete({ where: { id: params.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
