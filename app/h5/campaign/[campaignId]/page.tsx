"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Award, ChevronRight, Lock, MapPin, Nfc, Sparkles, Store, Ticket, Timer, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchH5Campaign, fetchH5Tasks } from "@/lib/h5/api";
import type { H5Task, TaskStatus } from "@/lib/h5/types";
import { useH5CampaignStore } from "@/store/h5-campaign-store";

const taskStatusMeta: Record<
  TaskStatus,
  { label: string; tone: string; nodeClass: string; badgeVariant: "default" | "success" | "warning" | "muted" }
> = {
  LOCKED: {
    label: "未解锁",
    tone: "text-slate-400",
    nodeClass: "border-slate-200 bg-slate-100 text-slate-400",
    badgeVariant: "muted",
  },
  AVAILABLE: {
    label: "可挑战",
    tone: "text-[#FF5A2C]",
    nodeClass: "border-[#FF5A2C] bg-white text-[#FF5A2C] shadow-[0_0_0_4px_rgba(255,90,44,0.12)]",
    badgeVariant: "default",
  },
  SUBMITTED: {
    label: "审核中",
    tone: "text-amber-600",
    nodeClass: "border-amber-300 bg-amber-50 text-amber-600",
    badgeVariant: "warning",
  },
  APPROVED: {
    label: "已点亮",
    tone: "text-emerald-700",
    nodeClass: "border-emerald-500 bg-emerald-50 text-emerald-700",
    badgeVariant: "success",
  },
};

function TaskIcon({ status, level }: { status: TaskStatus; level: number }) {
  if (status === "LOCKED") return <Lock className="h-5 w-5" />;
  if (status === "APPROVED") return <Sparkles className="h-5 w-5" />;
  return <span className="text-sm font-black">L{level}</span>;
}

function RewardCoupon({
  task,
  status,
  pageBackground,
}: {
  task: H5Task;
  status: TaskStatus;
  pageBackground: string;
}) {
  const unlocked = status === "APPROVED";

  return (
    <div
      className={`relative overflow-hidden rounded-lg border-2 border-dashed p-3 ${
        unlocked
          ? "border-[#FF5A2C] bg-white text-[#1F2937] shadow-sm"
          : "border-slate-200 bg-slate-100 text-slate-400"
      }`}
    >
      <span
        className={`absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full ${pageBackground}`}
        aria-hidden="true"
      />
      <span
        className={`absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full ${pageBackground}`}
        aria-hidden="true"
      />
      {unlocked ? (
        <div className="pointer-events-none absolute inset-x-2 top-0 h-8 overflow-hidden" aria-hidden="true">
          <span className="absolute left-6 top-1 h-1.5 w-1.5 animate-[treasure-confetti_1.5s_ease-out_infinite] rounded-full bg-[#FF5A2C]" />
          <span className="absolute left-1/2 top-0 h-1.5 w-1.5 animate-[treasure-confetti_1.7s_ease-out_infinite] rounded-full bg-amber-300 [animation-delay:120ms]" />
          <span className="absolute right-8 top-1 h-1.5 w-1.5 animate-[treasure-confetti_1.4s_ease-out_infinite] rounded-full bg-emerald-400 [animation-delay:240ms]" />
        </div>
      ) : null}
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
            unlocked ? "bg-orange-50 text-[#FF5A2C]" : "bg-white text-slate-300"
          }`}
        >
          <Ticket className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide">{unlocked ? "已解锁奖励" : "通关后解锁"}</p>
          <h3 className="mt-1 text-sm font-bold leading-5">{task.reward}</h3>
          <p className="mt-1 text-xs leading-5">{task.shortTitle}</p>
        </div>
      </div>
    </div>
  );
}

export default function CampaignPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const taskStatus = useH5CampaignStore((state) => state.taskStatus);
  const pageBackground = "bg-[#F5F0EB]";

  const { data: campaign, isLoading: campaignLoading } = useQuery({
    queryKey: ["h5-campaign", campaignId],
    queryFn: () => fetchH5Campaign(campaignId),
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["h5-tasks", campaignId],
    queryFn: () => fetchH5Tasks(campaignId),
  });

  const approvedCount = tasks.filter((task) => taskStatus[task.id] === "APPROVED").length;
  const allApproved = tasks.length > 0 && approvedCount === tasks.length;

  if (campaignLoading || !campaign) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#FF5A2C] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="-mx-4 -my-4 min-h-screen bg-[#F5F0EB] px-4 pb-6 pt-4 text-[#1F2937]">
      <div className="space-y-4">
        <section className="rounded-lg bg-[#FF5A2C] p-5 text-white shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white text-xl font-bold text-[#FF5A2C]">
              {campaign.merchant.logo}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm text-orange-100">{campaign.merchant.name}</p>
              <h2 className="text-2xl font-black leading-tight">{campaign.title}</h2>
            </div>
          </div>
          <div className="rounded-lg bg-white/15 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Trophy className="h-5 w-5" />
              通关抽霸王餐，三步点亮门店宝藏
            </div>
            <p className="mt-2 text-sm leading-6 text-orange-50">
              碰 NFC 开局，拍照点评解锁招牌菜，发布内容赢甜品和终极抽奖资格。
              <Link href={`/h5/campaign/${campaignId}/tasks`} className="ml-1 underline underline-offset-4">
                查看详情
              </Link>
            </p>
          </div>
          <div className="mt-4 grid gap-2 text-xs text-orange-50">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">{campaign.merchant.address}</span>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 shrink-0" />
              <span>
                {campaign.startDate} - {campaign.endDate}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-orange-100 bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-orange-50 p-2 text-[#FF5A2C]">
              <Nfc className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">NFC / 扫码入口</h3>
                <Badge className="bg-orange-100 text-[#FF5A2C]">到店即玩</Badge>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {campaign.guide}。每点亮一站就解锁一张奖励券，通关后领取终极福利。
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">寻宝地图</p>
              <h3 className="text-lg font-black">已点亮 {approvedCount} / {tasks.length} 站</h3>
            </div>
            <Badge className={allApproved ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-[#FF5A2C]"}>
              {allApproved ? "终极大奖已解锁" : "继续闯关"}
            </Badge>
          </div>

          <div className="relative space-y-4 before:absolute before:left-6 before:top-6 before:h-[calc(100%-3rem)] before:border-l-2 before:border-dashed before:border-orange-200">
            {tasks.map((task) => {
              const status = taskStatus[task.id];
              const meta = taskStatusMeta[status];
              return (
                <div key={task.id} className={`relative flex gap-3 ${status === "LOCKED" ? "opacity-70" : ""}`}>
                  <div
                    className={`z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 ${meta.nodeClass}`}
                  >
                    <TaskIcon status={status} level={task.level} />
                  </div>
                  <div className="min-w-0 flex-1 rounded-lg border border-slate-100 bg-[#FAFAF8] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold ${meta.tone}`}>{meta.label}</p>
                        <h3 className="mt-1 text-base font-bold leading-6">{task.shortTitle}</h3>
                      </div>
                      <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{task.description}</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-[#FF5A2C]">奖励：{task.reward}</span>
                      {status === "APPROVED" ? (
                        <span className="-rotate-6 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">
                          已点亮
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black">宝藏奖励券</h3>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Award className="h-3.5 w-3.5" />
              点亮后领取
            </div>
          </div>
          {tasks.map((task) => (
            <RewardCoupon key={task.id} task={task} status={taskStatus[task.id]} pageBackground={pageBackground} />
          ))}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <Store className="h-5 w-5 text-slate-500" />
            <div className="text-sm text-slate-600">
              <p>营业时间：{campaign.merchant.businessHours}</p>
              <p>客服电话：{campaign.merchant.phone}</p>
            </div>
          </div>
        </section>

        <Button asChild className="h-12 w-full bg-[#FF5A2C] text-base text-white hover:bg-[#e94f25]">
          <Link href={`/h5/campaign/${campaignId}/tasks`}>
            开始闯关
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
