import { getParticipationFlowState, sprintError, sprintSuccess } from "@/lib/api/sprint10";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: { id: string };
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const flowState = await getParticipationFlowState(params.id);
    return sprintSuccess(flowState);
  } catch (error) {
    return sprintError(error);
  }
}
