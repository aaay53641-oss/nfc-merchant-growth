import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api/errors";
import {
  getParticipationOrThrow,
  serializeParticipation,
  serializeSubmission,
} from "@/lib/api/h5";

export const dynamic = "force-dynamic";

type ParticipationRouteParams = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: ParticipationRouteParams) {
  try {
    const participation = await getParticipationOrThrow(params.id);

    return NextResponse.json({
      participation: serializeParticipation(participation),
      submissions: participation.submissions.map(serializeSubmission),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
