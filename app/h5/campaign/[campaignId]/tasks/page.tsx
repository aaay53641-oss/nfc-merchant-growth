"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock3, Lock, Send, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import { fetchH5Tasks, getOrCreateParticipation } from "@/lib/h5/api";
import type { H5Task, TaskStatus } from "@/lib/h5/types";
import { useH5CampaignStore } from "@/store/h5-campaign-store";

const statusText: Record<TaskStatus, string> = {
  LOCKED: "未解锁",
  AVAILABLE: "可进行",
  SUBMITTED: "待审核",
  APPROVED: "已通过",
};

function statusBadgeVariant(status: TaskStatus) {
  if (status === "APPROVED") return "success";
  if (status === "SUBMITTED") return "warning";
  if (status === "LOCKED") return "muted";
  return "default";
}

function statusIcon(status: TaskStatus) {
  if (status === "APPROVED") return <CheckCircle2 className="h-4 w-4" />;
  if (status === "SUBMITTED") return <Clock3 className="h-4 w-4" />;
  if (status === "LOCKED") return <Lock className="h-4 w-4" />;
  return <Send className="h-4 w-4" />;
}

export default function TasksPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const [reviewTask, setReviewTask] = useState<H5Task | null>(null);
  const taskStatus = useH5CampaignStore((state) => state.taskStatus);
  const setTaskStatus = useH5CampaignStore((state) => state.setTaskStatus);
  const approveTask = useH5CampaignStore((state) => state.approveTask);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["h5-tasks", campaignId],
    queryFn: () => fetchH5Tasks(campaignId),
  });

  const approvedCount = tasks.filter((task) => taskStatus[task.id] === "APPROVED").length;
  const progress = tasks.length ? Math.round((approvedCount / tasks.length) * 100) : 0;

  const submitL1 = (task: H5Task) => {
    setTaskStatus(task.id, "SUBMITTED");
    setReviewTask(task);
    toast({ title: "已提交第一关", description: "NFC 与企微任务进入待审核状态。" });
  };

  const approveCurrent = () => {
    if (!reviewTask) return;
    approveTask(reviewTask.id);
    setReviewTask(null);
    toast({ title: "审核通过", description: `${reviewTask.title} 已完成，下一关已解锁。` });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">三关任务</h2>
            <p className="mt-1 text-sm text-slate-500">按顺序完成，每关审核通过后解锁下一关。</p>
          </div>
          <Badge variant="secondary">{progress}%</Badge>
        </div>
        <Progress value={progress} className="mt-4" />
      </section>

      {tasks.map((task) => {
        const status = taskStatus[task.id];
        const isLocked = status === "LOCKED";
        const isSubmitted = status === "SUBMITTED";
        const isApproved = status === "APPROVED";

        return (
          <Card key={task.id} className={isLocked ? "bg-slate-50" : "bg-white"}>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-bold ${
                      isApproved
                        ? "bg-emerald-600 text-white"
                        : isLocked
                        ? "bg-slate-200 text-slate-500"
                        : "bg-blue-600 text-white"
                    }`}
                  >
                    L{task.level}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-950">{task.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{task.description}</p>
                  </div>
                </div>
                <Badge variant={statusBadgeVariant(status)} className="shrink-0 gap-1">
                  {statusIcon(status)}
                  {statusText[status]}
                </Badge>
              </div>

              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-900">奖励：{task.reward}</p>
                <p className="mt-1 text-xs text-slate-500">预计完成：{task.estimatedTime}</p>
              </div>

              <div className="space-y-2">
                {task.steps.map((step, index) => (
                  <div key={step} className="flex gap-2 text-sm text-slate-600">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>

              {task.id === "l1" && status === "AVAILABLE" ? (
                <Button className="h-11 w-full" onClick={() => submitL1(task)}>
                  已碰 NFC 并添加微信
                </Button>
              ) : null}

              {task.id === "l1" && isSubmitted ? (
                <Button variant="outline" className="h-11 w-full" onClick={() => setReviewTask(task)}>
                  查看待审核状态
                </Button>
              ) : null}

              {task.id === "l2" && status === "AVAILABLE" ? (
                <Button asChild className="h-11 w-full">
                  <Link href={`/h5/campaign/${campaignId}/submit?taskId=l2-review`}>上传打卡 / 点评凭证</Link>
                </Button>
              ) : null}

              {task.id === "l3" && status === "AVAILABLE" ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button asChild variant="outline" className="h-11">
                    <Link href={`/h5/campaign/${campaignId}/ai-copy`}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      AI文案
                    </Link>
                  </Button>
                  <Button asChild className="h-11">
                    <Link href={`/h5/campaign/${campaignId}/submit?taskId=l3-post`}>提交链接</Link>
                  </Button>
                </div>
              ) : null}

              {isApproved ? (
                <Button asChild variant="outline" className="h-11 w-full">
                  <Link href={`/h5/campaign/${campaignId}/rewards`}>去领取奖励</Link>
                </Button>
              ) : null}

              {isLocked ? (
                <Button variant="secondary" className="h-11 w-full" disabled>
                  先完成上一关
                </Button>
              ) : null}
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={Boolean(reviewTask)} onOpenChange={(open) => !open && setReviewTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>审核状态</DialogTitle>
            <DialogDescription>
              {reviewTask?.title} 已提交。当前为 Mock 流程，可点击按钮模拟门店审核通过。
            </DialogDescription>
          </DialogHeader>
          <Button className="h-11 w-full" onClick={approveCurrent}>
            模拟审核通过
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
