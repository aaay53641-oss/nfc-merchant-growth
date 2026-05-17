"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePageView } from "@/lib/h5/hooks";
import { CheckCircle2, Clock3, Lock, Send, Sparkles, Trophy } from "lucide-react";
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
import { toast } from "@/components/ui/use-toast";
import { fetchH5Tasks } from "@/lib/h5/api";
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

function statusNodeClass(status: TaskStatus) {
  if (status === "APPROVED") return "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]";
  if (status === "SUBMITTED") return "border-amber-300 bg-amber-50 text-amber-700 shadow-[0_0_0_6px_rgba(245,158,11,0.12)]";
  if (status === "LOCKED") return "border-slate-200 bg-slate-100 text-slate-400";
  return "border-brand-orange bg-white text-brand-orange-deep shadow-[0_0_0_6px_rgba(255,90,44,0.14)]";
}

export default function TasksPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  usePageView("tasks", campaignId);

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
      <div className="space-y-4">
        <div className="skeleton-block h-36" />
        <div className="skeleton-block h-44" />
        <div className="skeleton-block h-44" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-orange-100 bg-white/95 p-4 shadow-[0_18px_42px_-34px_rgba(255,90,44,0.65)]">
        <div className="absolute -right-14 -top-14 h-36 w-36 rounded-full bg-orange-100" aria-hidden="true" />
        <div className="relative flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">Quest map</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-brand-ink">三关寻宝路线</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">按顺序点亮节点，每关审核通过后解锁下一关。</p>
          </div>
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-orange text-white shadow-[0_18px_34px_-22px_rgba(255,90,44,0.9)]">
            <Trophy className="size-6" />
          </div>
        </div>
        <div className="relative mt-4 overflow-hidden rounded-2xl border border-orange-100 bg-[#FFF7F2] p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-700">点亮进度</span>
            <Badge variant={progress === 100 ? "success" : "secondary"}>{progress}%</Badge>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {tasks.map((task) => (
              <div key={task.id} className="rounded-xl bg-white/80 p-2 text-center shadow-sm">
                <span className={`mx-auto flex size-8 items-center justify-center rounded-full border-2 ${statusNodeClass(taskStatus[task.id])}`}>
                  {taskStatus[task.id] === "APPROVED" ? <Sparkles className="size-4" /> : `L${task.level}`}
                </span>
                <p className="mt-1 truncate text-[11px] font-semibold text-slate-600">{statusText[taskStatus[task.id]]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="relative space-y-4 before:absolute before:left-5 before:top-8 before:h-[calc(100%-4rem)] before:border-l-2 before:border-dashed before:border-orange-200">
        {tasks.map((task) => {
        const status = taskStatus[task.id];
        const isLocked = status === "LOCKED";
        const isSubmitted = status === "SUBMITTED";
        const isApproved = status === "APPROVED";

        return (
          <Card key={task.id} className={`relative ml-9 ${isLocked ? "bg-slate-50/90" : "bg-white/95"}`}>
            <div
              className={`absolute -left-[3.6rem] top-5 z-10 flex size-12 items-center justify-center rounded-full border-2 text-sm font-black ${statusNodeClass(status)}`}
              aria-hidden="true"
            >
              {isApproved ? <Sparkles className="size-5" /> : isLocked ? <Lock className="size-5" /> : `L${task.level}`}
            </div>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                      isApproved
                        ? "bg-emerald-50 text-emerald-700"
                        : isLocked
                        ? "bg-slate-200 text-slate-500"
                        : "bg-orange-50 text-brand-orange-deep"
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

              <div className={`tear-coupon p-3 ${isApproved ? "border-emerald-300 bg-emerald-50/70" : isLocked ? "border-slate-200 bg-slate-50 text-slate-500" : "border-orange-200 bg-orange-50/70"}`}>
                <p className="text-sm font-semibold text-slate-900">奖励：{task.reward}</p>
                <p className="mt-1 text-xs text-slate-500">预计完成：{task.estimatedTime}</p>
              </div>

              <div className="space-y-2">
                {task.steps.map((step, index) => (
                  <div key={step} className="flex gap-2 text-sm text-slate-600">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-50 text-xs font-semibold text-brand-orange-deep">
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
      </div>

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
