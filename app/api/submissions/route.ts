import { TaskStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { handleRouteError, HttpError } from "@/lib/api/errors";
import {
  createSubmissionSchema,
  getOrCreateUserForOpenid,
  getParticipationOrThrow,
  serializeSubmission,
} from "@/lib/api/h5";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = createSubmissionSchema.parse(await request.json());
    const participation = await getParticipationOrThrow(body.participationId);
    const task = await prisma.campaignTask.findUnique({
      where: { id: body.taskId },
    });

    if (!task) {
      throw new HttpError("Task not found", 404);
    }

    if (task.campaignId !== participation.campaignId) {
      throw new HttpError("Task does not belong to participation campaign", 400);
    }

    const user = await getOrCreateUserForOpenid(participation.openid);
    const submission = await prisma.taskSubmission.upsert({
      where: {
        userId_taskId: {
          userId: user.id,
          taskId: task.id,
        },
      },
      create: {
        userId: user.id,
        taskId: task.id,
        participationId: participation.id,
        content: body.content,
        imageUrls: body.imageUrls ?? [],
        platformLink: body.platformLink,
        status: TaskStatus.SUBMITTED,
      },
      update: {
        participationId: participation.id,
        content: body.content,
        imageUrls: body.imageUrls ?? [],
        platformLink: body.platformLink,
        status: TaskStatus.SUBMITTED,
        reviewNote: null,
        reviewedAt: null,
        reviewedBy: null,
        submittedAt: new Date(),
      },
      include: {
        task: {
          include: {
            reward: true,
          },
        },
      },
    });

    return NextResponse.json({ submission: serializeSubmission(submission) });
  } catch (error) {
    return handleRouteError(error);
  }
}
