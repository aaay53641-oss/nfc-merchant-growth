import { TaskStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { handleRouteError, HttpError } from "@/lib/api/errors";
import {
  refreshParticipationProgress,
  reviewSubmissionSchema,
  serializeSubmission,
} from "@/lib/api/h5";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SubmissionRouteParams = {
  params: {
    id: string;
  };
};

export async function PATCH(request: NextRequest, { params }: SubmissionRouteParams) {
  try {
    const body = reviewSubmissionSchema.parse(await request.json());
    const existingSubmission = await prisma.taskSubmission.findUnique({
      where: { id: params.id },
      select: { id: true, participationId: true },
    });

    if (!existingSubmission) {
      throw new HttpError("Submission not found", 404);
    }

    const submission = await prisma.taskSubmission.update({
      where: { id: params.id },
      data: {
        status: body.status as TaskStatus,
        reviewNote: body.reviewNote,
        reviewedAt: new Date(),
      },
      include: {
        task: {
          include: {
            reward: true,
          },
        },
      },
    });

    if (existingSubmission.participationId) {
      await refreshParticipationProgress(existingSubmission.participationId);
    }

    return NextResponse.json({ submission: serializeSubmission(submission) });
  } catch (error) {
    return handleRouteError(error);
  }
}
