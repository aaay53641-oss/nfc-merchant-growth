import { VerificationMethod, VerificationStatus } from "@prisma/client";

import {
  sprintError,
  sprintSuccess,
  staffConfirmPayloadSchema,
  submitParticipationVerification,
} from "@/lib/api/sprint10";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: { id: string };
};

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const body = staffConfirmPayloadSchema.parse(await request.json());
    const result = await submitParticipationVerification({
      participationId: params.id,
      taskSortOrder: body.taskSortOrder,
      method: VerificationMethod.STAFF_CONFIRM,
      platform: body.platform,
      content: body.note ?? "店员现场确认",
      status: VerificationStatus.APPROVED,
    });

    return sprintSuccess(result);
  } catch (error) {
    return sprintError(error);
  }
}
