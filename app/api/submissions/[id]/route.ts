import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { approveTask, rejectTask } from "@/lib/engine/task-engine";

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().optional(),
  reviewerId: z.string().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = reviewSchema.parse(await request.json());
    const submissionId = params.id;

    if (body.status === "APPROVED") {
      const result = await approveTask(submissionId, body.reviewerId);
      return NextResponse.json({
        success: true,
        submissionId,
        taskId: result.taskId,
        newStatus: result.newStatus,
        nextTaskUnlocked: result.nextTaskUnlocked,
      });
    }

    const result = await rejectTask(submissionId, body.reviewNote ?? "", body.reviewerId);
    return NextResponse.json({
      success: true,
      submissionId,
      taskId: result.taskId,
      newStatus: result.newStatus,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid review status" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Review failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
