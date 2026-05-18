"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BrainCircuit,
  ClipboardCheck,
  Gift,
  MessageSquareText,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Utensils,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SuggestionType = "today" | "weekly" | "dish" | "reward" | "script" | "dark_horse";

interface AdvisorSuggestion {
  type: SuggestionType;
  title: string;
  content: string;
}

interface AdvisorPayload {
  metrics: {
    currentParticipants: number;
    previousParticipants: number;
    participantDeltaPercent: number;
    pendingReviews: number;
    rewardsIssued: number;
    rewardsRedeemed: number;
    redemptionRate: number;
    averageTaskCompletionRate: number;
    taskCompletionRates: Array<{
      taskId: string;
      title: string;
      sortOrder: number;
      approvedCount: number;
      participants: number;
      completionRate: number;
    }>;
    platformDistribution: Array<{ platform: string; count: number }>;
  };
  weeklyReport: {
    summary: string;
    taskSummary: string;
    rewardSummary: string;
    recommendation: string;
    mainTaskTitle: string | null;
  };
  suggestions: AdvisorSuggestion[];
  generatedAt: string;
  source: "ai" | "fallback" | "metrics";
}

const suggestionMeta: Record<SuggestionType, { icon: typeof Sparkles; tone: string }> = {
  today: { icon: Zap, tone: "bg-orange-50 text-brand-orange-deep ring-orange-100" },
  weekly: { icon: TrendingUp, tone: "bg-blue-50 text-blue-700 ring-blue-100" },
  dish: { icon: Utensils, tone: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  reward: { icon: Gift, tone: "bg-violet-50 text-violet-700 ring-violet-100" },
  script: { icon: MessageSquareText, tone: "bg-amber-50 text-amber-700 ring-amber-100" },
  dark_horse: { icon: Target, tone: "bg-slate-100 text-slate-700 ring-slate-200" },
};

async function fetchAdvisor(): Promise<AdvisorPayload> {
  const response = await fetch("/api/merchant/advisor");
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? "Failed to load advisor");
  }

  return response.json();
}

function formatDelta(value: number) {
  return value >= 0 ? `+${value}%` : `${value}%`;
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="skeleton-block h-14 max-w-xl" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="skeleton-block h-28" />
        <div className="skeleton-block h-28" />
        <div className="skeleton-block h-28" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton-block h-40" />
          ))}
        </div>
        <div className="skeleton-block h-96" />
      </div>
    </div>
  );
}

export default function MerchantAdvisorPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["merchant-advisor"],
    queryFn: fetchAdvisor,
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <LoadingState />;

  if (isError || !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="surface-panel max-w-md text-center">
          <CardHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-orange-50 text-brand-orange">
              <BrainCircuit className="size-6" />
            </div>
            <CardTitle>运营参谋暂不可用</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500">
              {error instanceof Error ? error.message : "请稍后重试。"}
            </p>
            <Button onClick={() => refetch()}>
              <RefreshCw className="size-4" />
              重新加载
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { metrics, weeklyReport, suggestions } = data;
  const topTask = metrics.taskCompletionRates
    .slice()
    .sort((a, b) => b.completionRate - a.completionRate || b.approvedCount - a.approvedCount)[0];
  const topPlatform = metrics.platformDistribution[0];

  const kpis = [
    { label: "本周参与", value: metrics.currentParticipants, sub: `环比 ${formatDelta(metrics.participantDeltaPercent)}` },
    { label: "平均完成率", value: `${metrics.averageTaskCompletionRate}%`, sub: "按任务通过数计算" },
    { label: "奖励核销率", value: `${metrics.redemptionRate}%`, sub: `${metrics.rewardsRedeemed}/${metrics.rewardsIssued} 已核销` },
    { label: "待审核", value: metrics.pendingReviews, sub: "建议当日清零" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">AI operator</p>
          <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950">运营参谋</h2>
          <p className="mt-2 text-sm text-slate-500">基于近 7 天参与、审核、奖励和平台跳转数据生成门店行动建议。</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={data.source === "ai" ? "success" : "warning"}>
            {data.source === "ai" ? "AI生成" : "本地建议"}
          </Badge>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <Card key={item.label} className="kpi-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{item.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-3xl font-black tracking-tight text-slate-950">{item.value}</p>
              <p className="mt-1 text-xs text-slate-500">{item.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
        <section className="grid gap-4 sm:grid-cols-2">
          {suggestions.map((suggestion) => {
            const meta = suggestionMeta[suggestion.type];
            const Icon = meta.icon;

            return (
              <Card key={suggestion.type} className="surface-panel">
                <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                  <div className={`rounded-2xl p-2 ring-1 ${meta.tone}`}>
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{suggestion.title}</CardTitle>
                    <p className="mt-1 text-xs text-slate-500">生成于 {new Date(data.generatedAt).toLocaleString("zh-CN")}</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-slate-700">{suggestion.content}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <aside className="space-y-4">
          <Card className="surface-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardCheck className="size-5 text-brand-orange" />
                本周数据摘要
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
              <p>{weeklyReport.summary}</p>
              <p>{weeklyReport.taskSummary}</p>
              <p>{weeklyReport.rewardSummary}</p>
              <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-3 text-brand-orange-deep">
                {weeklyReport.recommendation}
              </div>
            </CardContent>
          </Card>

          <Card className="surface-panel">
            <CardHeader>
              <CardTitle className="text-lg">主推任务</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {topTask ? (
                <div className="rounded-2xl border border-slate-100 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">{topTask.title}</p>
                    <Badge variant="success">{topTask.completionRate}%</Badge>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-orange to-amber-300"
                      style={{ width: `${Math.min(topTask.completionRate, 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    通过 {topTask.approvedCount}/{topTask.participants || 0}
                  </p>
                </div>
              ) : (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">暂无任务完成数据。</p>
              )}

              {topPlatform ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">主要平台</p>
                  <p className="mt-1 font-semibold text-slate-950">{topPlatform.platform}</p>
                  <p className="mt-1 text-xs text-slate-500">{topPlatform.count} 次跳转</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
