import { VerificationStatus } from "@prisma/client";

import { resolveMerchantScope } from "@/lib/api/merchant";
import {
  listMerchantStepVerifications,
  qualityReviewPayloadSchema,
  reviewParticipationVerification,
  sprintError,
  sprintSuccess,
} from "@/lib/api/sprint10";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: { id: string };
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const merchant = await resolveMerchantScope(request);
    const submissions = await listMerchantStepVerifications({
      campaignId: params.id,
      merchantId: merchant.id,
      step: 3,
    });

    return sprintSuccess({ submissions });
  } catch (error) {
    return sprintError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const merchant = await resolveMerchantScope(request);
    const body = qualityReviewPayloadSchema.parse(await request.json());
    const score = body.qualityScore ?? 0;
    const status =
      body.status === "APPROVED" && score >= 60
        ? VerificationStatus.APPROVED
        : VerificationStatus.REJECTED;

    const result = await reviewParticipationVerification({
      verificationId: body.verificationId,
      merchantId: merchant.id,
      status,
      reviewNote: body.reviewNote ?? (score < 60 ? "内容质量未达到抽奖资格线" : undefined),
      qualityScore: score,
      qualityBreakdown: body.qualityBreakdown,
    });

    return sprintSuccess(result);
  } catch (error) {
    return sprintError(error);
  }
}
