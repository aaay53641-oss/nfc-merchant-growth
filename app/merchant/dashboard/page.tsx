"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeCheck, BarChart3, Gift, Nfc, Store, Users } from "lucide-react";

interface Stats {
  todayNfcTaps: number;
  todayApproved: number;
  pendingCount: number;
  todayRedeemed: number;
  totalCampaigns: number;
  totalStores: number;
  weeklyEngagement: { date: string; count: number }[];
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
