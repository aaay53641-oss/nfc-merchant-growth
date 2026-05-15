import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api/errors";
import { getCampaignTasksOrThrow, serializeTask } from "@/lib/api/h5";

export const dynamic = "force-dynamic";

type CampaignTasksRouteParams = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: CampaignTasksRouteParams) {
  try {
    const tasks = await getCampaignTasksOrThrow(params.id);

    return NextResponse.json({ tasks: tasks.map(serializeTask) });
  } catch (error) {
    return handleRouteError(error);
  }
}
