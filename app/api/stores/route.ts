import { NextRequest, NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api/errors";
import {
  listMerchantStores,
  resolveMerchantScope,
  serializeStore,
  storePayloadSchema,
  storeWithCountsInclude,
} from "@/lib/api/merchant";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const merchant = await resolveMerchantScope(request);
    const stores = await listMerchantStores(merchant.id);

    return NextResponse.json({
      merchant,
      stores: stores.map(serializeStore),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const merchant = await resolveMerchantScope(request);
    const body = storePayloadSchema.parse(await request.json());
    const store = await prisma.store.create({
      data: {
        merchantId: merchant.id,
        name: body.name,
        address: body.address,
        phone: body.phone,
      },
      include: storeWithCountsInclude,
    });

    return NextResponse.json({ store: serializeStore(store) }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
