"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Bot,
  CheckCircle2,
  Megaphone,
  TicketCheck,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED";
type DailyTrend = {
  date: string;
  participations: number;
  tasksCompleted: number;
  rewardsClaimed: number;
  rewardsRedeemed: number;
};
type PlatformOverview = {
  totalCampaigns: number;
  activeCampaigns: number;
  totalParticipations: number;
  totalTasksCompleted: number;
  totalRewardsClaimed: number;
  totalRewardsRedeemed: number;
  redemptionRate: number;
  avgTasksPerParticipation: number;
  topCampaigns: Array<{
    id: string;
    name: string;
    storeName: string;
    participations: number;
    completionRate: number;
  }>;
  dailyTrend: DailyTrend[];
  campaignStatusDistribution: Array<{ status: CampaignStatus; count: number }>;
};
type AIEffectiveness = {
  totalGenerations: number;
  byPlatform: Array<{ platform: string; count: number }>;
  byStyle: Array<{ style: string; count: number }>;
  avgContentLength: number;
  topTags: Array<{ tag: string; count: number }>;
};

async function loadJson<T>(path: string, fallback: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? fallback);
  }
  return response.json();
}

function fetchOverview() {
  return loadJson<PlatformOverview>("/api/platform/stats/overview", "Failed to load overview");
}

function fetchAIEffectiveness() {
  return loadJson<AIEffectiveness>(
    "/api/platform/stats/ai-effectiveness",
    "Failed to load AI effectiveness"
  );
}

function formatNumber(value: number | undefined) {
  return (value ?? 0).toLocaleString();
}

function formatPercent(value: number | undefined) {
  return `${(((value ?? 0) as number) * 100).toFixed(1)}%`;
}

function statusLabel(status: CampaignStatus) {
  const labels: Record<CampaignStatus, string> = {
    DRAFT: "草稿",
    ACTIVE: "进行中",
    PAUSED: "已暂停",
    ENDED: "已结束",
  };
  return labels[status];
}

function platformLabel(value: string) {
  const labels: Record<string, string> = {
    xiaohongshu: "小红书",
    douyin: "抖音",
    dianping: "大众点评",
    weixin_moments: "朋友圈",
    unknown: "未知",
  };
  return labels[value] ?? value;
}

function styleLabel(value: string) {
  const labels: Record<string, string> = {
    vibe: "氛围感",
    deal_hunter: "性价比",
    foodie_review: "探店风",
    real_experience: "真实体验",
    date_night: "约会聚餐",
    friend_gathering: "朋友聚会",
    unknown: "未知",
  };
  return labels[value] ?? value;
}

function TrendChart({ data }: { data: DailyTrend[] }) {
  const series = [
    { key: "participations" as const, label: "参与", color: "#2563eb" },
    { key: "tasksCompleted" as const, label: "任务完成", color: "#16a34a" },
    { key: "rewardsClaimed" as const, label: "领奖", color: "#f97316" },
    { key: "rewardsRedeemed" as const, label: "核销", color: "#9333ea" },
  ];
  const max = Math.max(1, ...data.flatMap((item) => series.map((line) => item[line.key])));
  const divisor = Math.max(1, data.length - 1);
  const pointsFor = (key: (typeof series)[number]["key"]) =>
    data
      .map((item, index) => {
        const x = (index / divisor) * 100;
        const y = 92 - (item[key] / max) * 78;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {series.map((line) => (
          <div key={line.key} className="flex items-center gap-2 text-xs text-slate-500">
            <span className="size-2 rounded-full" style={{ backgroundColor: line.color }} />
            {line.label}
          </div>
        ))}
      </div>
      <div className="h-72 w-full rounded-md border bg-white p-4">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          {[14, 40, 66, 92].map((y) => (
            <line
              key={y}
              x1="0"
              x2="100"
              y1={y}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth="0.35"
            />
          ))}
          {series.map((line) => (
            <polyline
              key={line.key}
              fill="none"
              stroke={line.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.4"
              points={pointsFor(line.key)}
            />
          ))}
        </svg>
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{data[0]?.date.slice(5) ?? "--"}</span>
        <span>{data[Math.max(0, data.length - 1)]?.date.slice(5) ?? "--"}</span>
      </div>
    </div>
  );
}

function HorizontalBars({
  data,
  labelFor,
}: {
  data: Array<{ label: string; count: number }>;
  labelFor?: (value: string) => string;
}) {
  const max = Math.max(1, ...data.map((item) => item.count));

  if (data.length === 0) {
    return <div className="py-8 text-center text-sm text-slate-500">暂无数据</div>;
  }

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label} className="grid grid-cols-[96px_1fr_48px] items-center gap-3 text-sm">
          <span className="truncate text-slate-600">{labelFor ? labelFor(item.label) : item.label}</span>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-slate-900"
              style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }}
            />
          </div>
          <span className="text-right font-medium">{item.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function PlatformAnalyticsPage() {
  const overviewQuery = useQuery({
    queryKey: ["platform-analytics-overview"],
    queryFn: fetchOverview,
  });
  const aiQuery = useQuery({
    queryKey: ["platform-ai-effectiveness"],
    queryFn: fetchAIEffectiveness,
  });

  const overview = overviewQuery.data;
  const ai = aiQuery.data;
  const loading = overviewQuery.isLoading || aiQuery.isLoading;
  const error = overviewQuery.error ?? aiQuery.error;
  const statusTotal = Math.max(
    1,
    ...(overview?.campaignStatusDistribution ?? []).map((item) => item.count)
  );
  const kpis = [
    {
      label: "参与人次",
      value: formatNumber(overview?.totalParticipations),
      icon: Users,
      hint: "全平台活动参与记录",
    },
    {
      label: "任务完成数",
      value: formatNumber(overview?.totalTasksCompleted),
      icon: CheckCircle2,
      hint: `人均 ${overview?.avgTasksPerParticipation.toFixed(2) ?? "0.00"} 个任务`,
    },
    {
      label: "核销率",
      value: formatPercent(overview?.redemptionRate),
      icon: TicketCheck,
      hint: `${formatNumber(overview?.totalRewardsRedeemed)} / ${formatNumber(
        overview?.totalRewardsClaimed
      )}`,
    },
    {
      label: "AI 生成次数",
      value: formatNumber(ai?.totalGenerations),
      icon: Bot,
      hint: `平均 ${formatNumber(ai?.avgContentLength)} 字`,
    },
    {
      label: "进行中活动",
      value: formatNumber(overview?.activeCampaigns),
      icon: Megaphone,
      hint: `共 ${formatNumber(overview?.totalCampaigns)} 个活动`,
    },
    {
      label: "奖励领取数",
      value: formatNumber(overview?.totalRewardsClaimed),
      icon: Activity,
      hint: "已生成兑换码",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">平台数据分析</h1>
        <p className="text-sm text-slate-500">活动参与、任务完成、奖励核销与 AI 文案效果。</p>
      </div>

      {error ? (
        <Card>
          <CardContent className="p-5 text-sm text-red-600">{error.message}</CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {loading ? "..." : item.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{item.hint}</p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-md bg-slate-100">
                  <Icon className="size-5 text-slate-700" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>近 30 天转化趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart data={overview?.dailyTrend ?? []} />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle>Top 5 热门活动</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="py-3 pr-4 font-medium">活动</th>
                    <th className="py-3 pr-4 font-medium">门店</th>
                    <th className="py-3 pr-4 font-medium">参与</th>
                    <th className="py-3 pr-4 font-medium">完成率</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview?.topCampaigns ?? []).map((campaign) => (
                    <tr key={campaign.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{campaign.name}</td>
                      <td className="py-3 pr-4 text-slate-600">{campaign.storeName}</td>
                      <td className="py-3 pr-4">{campaign.participations.toLocaleString()}</td>
                      <td className="py-3 pr-4">{formatPercent(campaign.completionRate)}</td>
                    </tr>
                  ))}
                  {!loading && (overview?.topCampaigns.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">
                        暂无活动数据
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>活动状态分布</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(overview?.campaignStatusDistribution ?? []).map((item) => (
              <div key={item.status} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{statusLabel(item.status)}</span>
                  <Badge variant={item.status === "ACTIVE" ? "success" : "secondary"}>
                    {item.count}
                  </Badge>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-slate-900"
                    style={{ width: `${Math.max(4, (item.count / statusTotal) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>AI 平台分布</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBars
              data={(ai?.byPlatform ?? []).map((item) => ({
                label: item.platform,
                count: item.count,
              }))}
              labelFor={platformLabel}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI 风格分布</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBars
              data={(ai?.byStyle ?? []).map((item) => ({
                label: item.style,
                count: item.count,
              }))}
              labelFor={styleLabel}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>高频标签</CardTitle>
          </CardHeader>
          <CardContent>
            {(ai?.topTags.length ?? 0) > 0 ? (
              <div className="flex flex-wrap gap-2">
                {ai?.topTags.map((tag) => (
                  <Badge key={tag.tag} variant="secondary">
                    #{tag.tag} · {tag.count}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-slate-500">暂无标签数据</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
