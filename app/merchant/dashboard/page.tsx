"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BadgeCheck, BarChart3, BrainCircuit, Gift, Nfc, Store, Users } from "lucide-react";

interface Stats {
  todayNfcTaps: number;
  todayApproved: number;
  pendingCount: number;
  todayRedeemed: number;
  totalCampaigns: number;
  totalStores: number;
  weeklyEngagement: { date: string; count: number }[];
}

interface AdvisorSummary {
  metrics: {
    currentParticipants: number;
    participantDeltaPercent: number;
    rewardsIssued: number;
    rewardsRedeemed: number;
    redemptionRate: number;
    averageTaskCompletionRate: number;
  };
  weeklyReport: {
    summary: string;
    taskSummary: string;
    rewardSummary: string;
    recommendation: string;
    mainTaskTitle: string | null;
  };
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["merchant-stats"],
    queryFn: async () => {
      const res = await fetch("/api/merchant/stats");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: advisorSummary } = useQuery<AdvisorSummary>({
    queryKey: ["merchant-advisor-summary"],
    queryFn: async () => {
      const res = await fetch("/api/merchant/advisor?includeSuggestions=false");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const cards = [
    { label: "今日碰卡", value: stats?.todayNfcTaps ?? "-", icon: Nfc, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "今日完成", value: stats?.todayApproved ?? "-", icon: BadgeCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "待审核", value: stats?.pendingCount ?? "-", icon: Users, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "今日核销", value: stats?.todayRedeemed ?? "-", icon: Gift, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "门店数", value: stats?.totalStores ?? "-", icon: Store, color: "text-slate-600", bg: "bg-slate-50" },
    { label: "活动数", value: stats?.totalCampaigns ?? "-", icon: BarChart3, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton-block h-12 max-w-sm" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton-block h-32" />
          ))}
        </div>
        <div className="skeleton-block h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">Merchant cockpit</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950">数据看板</h2>
        <p className="mt-2 text-sm text-slate-500">今日互动、审核和核销数据的实时运营视图。</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label} className="kpi-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{card.label}</CardTitle>
              <div className={`rounded-xl p-2 ${card.bg}`}>
                <card.icon className={`size-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-3xl font-black tracking-tight">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="surface-panel overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-orange">Weekly report</p>
            <CardTitle className="mt-1 text-lg">本周运营周报</CardTitle>
          </div>
          <Link
            href="/merchant/advisor"
            className="inline-flex items-center gap-1 rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-brand-orange-deep transition hover:border-brand-orange"
          >
            运营参谋 <ArrowRight className="size-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {advisorSummary ? (
            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-3 text-sm leading-6 text-slate-600">
                <p>{advisorSummary.weeklyReport.summary}</p>
                <p>{advisorSummary.weeklyReport.taskSummary}</p>
                <p>{advisorSummary.weeklyReport.rewardSummary}</p>
                <div className="rounded-2xl border border-orange-100 bg-[#FFF7F2] p-3 font-medium text-brand-orange-deep">
                  {advisorSummary.weeklyReport.recommendation}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">本周参与</p>
                  <p className="mt-1 font-mono text-2xl font-black">{advisorSummary.metrics.currentParticipants}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">任务完成率</p>
                  <p className="mt-1 font-mono text-2xl font-black">{advisorSummary.metrics.averageTaskCompletionRate}%</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">核销率</p>
                  <p className="mt-1 font-mono text-2xl font-black">{advisorSummary.metrics.redemptionRate}%</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              <BrainCircuit className="size-5 text-brand-orange" />
              正在生成本周运营周报
            </div>
          )}
        </CardContent>
      </Card>

      {stats?.weeklyEngagement && stats.weeklyEngagement.length > 0 ? (
        <Card className="surface-panel">
          <CardHeader>
            <CardTitle className="text-lg">本周参与趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1">
              {stats.weeklyEngagement.map((d) => {
                const max = Math.max(...stats.weeklyEngagement.map((x) => x.count), 1);
                const h = Math.max((d.count / max) * 160, 4);
                return (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1" title={`${d.date}: ${d.count}人`}>
                    <span className="text-xs font-medium text-slate-600">{d.count}</span>
                    <div className="w-full rounded-t-xl bg-gradient-to-t from-brand-orange to-amber-300 transition-all" style={{ height: `${h}px` }} />
                    <span className="text-xs text-slate-400">{d.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
