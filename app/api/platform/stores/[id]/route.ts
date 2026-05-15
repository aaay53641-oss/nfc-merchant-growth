import { NextRequest, NextResponse } from "next/server";

import { handleRouteError, HttpError } from "@/lib/api/errors";
import {
  createAuditLog,
  platformStoreInclude,
  platformStorePatchSchema,
  requirePlatformSession,
  serializePlatformStore,
} from "@/lib/api/platform";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: {
    id: string;
  };
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePlatformSession();
    const body = platformStorePatchSchema.parse(await request.json());
    const existing = await prisma.store.findUnique({
      where: { id: params.id },
      include: platformStoreInclude,
    });

    if (!existing) {
      throw new HttpError("Store not found", 404);
    }

    const store = await prisma.store.update({
      where: { id: params.id },
      data: { status: body.status },
      include: platformStoreInclude,
    });

    await createAuditLog({
      action: "platform.store.status.update",
      actorId: session.userId,
      targetType: "Store",
      targetId: store.id,
      detail: {
        beforeStatus: existing.status,
        afterStatus: store.status,
      },
    });

    return NextResponse.json({ store: serializePlatformStore(store) });
  } catch (error) {
    return handleRouteError(error);
  }
}
