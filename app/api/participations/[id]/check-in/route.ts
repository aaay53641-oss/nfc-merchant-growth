import { sprintError, sprintSuccess, completeCheckIn } from "@/lib/api/sprint10";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: { id: string };
};

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const result = await completeCheckIn(params.id);
    return sprintSuccess(result);
  } catch (error) {
    return sprintError(error);
  }
}
