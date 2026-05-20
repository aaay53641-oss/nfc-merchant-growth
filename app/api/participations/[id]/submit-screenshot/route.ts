import { VerificationMethod } from "@prisma/client";

import {
  sprintError,
  sprintSuccess,
  submitParticipationVerification,
  submitScreenshotPayloadSchema,
} from "@/lib/api/sprint10";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: { id: string };
};

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const body = submitScreenshotPayloadSchema.parse(await request.json());
    const result = await submitParticipationVerification({
      participationId: params.id,
      taskSortOrder: body.taskSortOrder,
      method: VerificationMethod.SCREENSHOT,
      platform: body.platform,
      screenshotUrl: body.screenshotUrl,
      content: body.content ?? "用户上传发布截图",
    });

    return sprintSuccess(result, 201);
  } catch (error) {
    return sprintError(error);
  }
}
