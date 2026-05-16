"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BarChart3, CheckCircle2, Clock3, Gift, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AnalyticsStats {
  todayNfcTaps: number;
  todayApproved: number;
  pendingCount: number;
  todayRedeemed: number;
  totalCampaigns: number;
  totalStores: number;
  weeklyEngagement: { date: string; count: number }[];
}

interface RedemptionRecord {
  code: string;
  status: string;
  userName: string;
  rewardName: string;
  createdAt: string;
}

export default function AnalyticsPage() {
  const { data: stats, isLoading } = useQuery<AnalyticsStats>({
    queryKey: ["merchant-stats"],
    queryFn: async () => {
      const res = await fetch("/api/merchant/stats");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: redemptions = [] } = useQuery<RedemptionRecord[]>({
    queryKey: ["merchant-redemptions-history"],
    queryFn: async () => {
      const res = await fetch("/api/merchant/redemptions");
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 60000,
  });

  const totalTasks = (stats?.todayApproved ?? 0) + (stats?.todayNfcTaps ?? 0);
  const redemptionRate = totalTasks > 0
    ? Math.round(((stats?.todayRedeemed ?? 0) / totalTasks) * 100)
    : 0;

  const kpis = [
    { label: "今日碰卡", value: stats?.todayNfcTaps ?? "-", icon: BarChart3, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "今日审核通过", value: stats?.todayApproved ?? "-", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "待审核", value: stats?.pendingCount ?? "-", icon: Clock3, color: "text-amber-600", bg: "bg-amber-50", link: "/merchant/reviews" },
    { label: "今日核销", value: stats?.todayRedeemed ?? "-", icon: Gift, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "核销率", value: `${redemptionRate}%`, icon: Users, color: "text-cyan-600", bg: "bg-cyan-50" },
    { label: "活跃活动", value: stats?.totalCampaigns ?? "-", icon: BarChart3, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">数据看板</h1>
        <p className="text-slate-500">实时活动数据与转化漏斗</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{kpi.label}</CardTitle>
              <div className={`rounded-md p-1.5 ${kpi.bg}`}>
                <kpi.icon className={`size-4 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{kpi.value}</p>
              {"link" in kpi && kpi.link ? (
                <Link href={kpi.link} className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  去审核 <ArrowRight className="size-3" />
                </Link>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">近7天参与趋势</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.weeklyEngagement && stats.weeklyEngagement.length > 0 ? (
              <div className="flex items-end gap-1" style={{ height: "200px" }}>
                {stats.weeklyEngagement.map((d) => {
                  const max = Math.max(...stats.weeklyEngagement.map((x) => x.count), 1);
                  const h = Math.max((d.count / max) * 180, 4);
                  return (
                    <div key={d.date} className="flex flex-1 flex-col items-center gap-1" title={`${d.date}: ${d.count}人`}>
                      <span className="text-xs font-medium text-slate-600">{d.count}</span>
                      <div className="w-full rounded-t bg-blue-500 transition-all" style={{ height: `${h}px` }} />
                      <span className="text-xs text-slate-400">{d.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-slate-400">暂无数据</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">最近核销</CardTitle>
            <Link href="/merchant/rewards" className="text-xs text-blue-600 hover:underline">查看全部</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {redemptions.slice(0, 8).map((r) => (
              <div key={r.code} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div>
                  <p className="font-mono text-xs font-semibold">{r.code}</p>
                  <p className="text-xs text-slate-500">{r.rewardName}</p>
                </div>
                <Badge variant={r.status === "USED" ? "success" : "warning"}>
                  {r.status === "USED" ? "已核销" : "待核销"}
                </Badge>
              </div>
            ))}
            {redemptions.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">暂无核销记录</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
