import { VerificationStatus } from "@prisma/client";
import { z } from "zod";

import { resolveMerchantScope } from "@/lib/api/merchant";
import {
  listMerchantStepVerifications,
  reviewParticipationVerification,
  sprintError,
  sprintSuccess,
} from "@/lib/api/sprint10";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: { id: string };
};

const reviewSchema = z.object({
  verificationId: z.string().trim().min(1),
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().trim().optional(),
});

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const merchant = await resolveMerchantScope(request);
    const submissions = await listMerchantStepVerifications({
      campaignId: params.id,
      merchantId: merchant.id,
      step: 2,
    });

    return sprintSuccess({ submissions });
  } catch (error) {
    return sprintError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const merchant = await resolveMerchantScope(request);
    const body = reviewSchema.parse(await request.json());
    const result = await reviewParticipationVerification({
      verificationId: body.verificationId,
      merchantId: merchant.id,
      status: VerificationStatus[body.status],
      reviewNote: body.reviewNote,
    });

    return sprintSuccess(result);
  } catch (error) {
    return sprintError(error);
  }
}
