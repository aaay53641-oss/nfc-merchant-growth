import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api/errors";
import { getActiveCampaignOrThrow, serializeCampaign } from "@/lib/api/h5";

export const dynamic = "force-dynamic";

type CampaignRouteParams = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: CampaignRouteParams) {
  try {
    const campaign = await getActiveCampaignOrThrow(params.id);

    return NextResponse.json(serializeCampaign(campaign));
  } catch (error) {
    return handleRouteError(error);
  }
}
