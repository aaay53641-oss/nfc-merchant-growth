"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, CheckCircle2, Store, TicketCheck, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TrendItem = { date: string; count: number };
type TopMerchant = {
  merchantId: string;
  merchantName: string;
  participants: number;
  redemptions: number;
};
type PlatformStatsResponse = {
  stats: {
    totalMerchants: number;
    activeMerchants: number;
    totalStores: number;
    totalCampaigns: number;
    totalParticipations: number;
    totalRedemptions: number;
    redemptionRate: number;
  };
  weeklyNewMerchants: TrendItem[];
  weeklyParticipations: TrendItem[];
  topMerchants: TopMerchant[];
};

async function fetchStats(): Promise<PlatformStatsResponse> {
  const response = await fetch("/api/platform/stats");
  if (!response.ok) throw new Error("Failed to load platform stats");
  return response.json();
}

function TrendList({ data }: { data: TrendItem[] }) {
  const max = Math.max(1, ...data.map((item) => item.count));
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.date} className="grid grid-cols-[92px_1fr_40px] items-center gap-3">
          <span className="text-xs text-slate-500">{item.date.slice(5)}</span>
          <div className="h-2.5 rounded-full bg-slate-100 shadow-inner">
            <div
              className="h-2.5 rounded-full bg-gradient-to-r from-slate-900 to-brand-orange"
              style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }}
            />
          </div>
          <span className="text-right text-xs font-medium">{item.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function PlatformDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: fetchStats,
  });

  const stats = data?.stats;
  const cards = [
    { label: "平台商家总数", value: stats?.totalMerchants, icon: Building2 },
    { label: "活跃商家数", value: stats?.activeMerchants, icon: CheckCircle2 },
    { label: "平台门店总数", value: stats?.totalStores, icon: Store },
    { label: "平台活动总数", value: stats?.totalCampaigns, icon: TicketCheck },
    { label: "平台总参与人次", value: stats?.totalParticipations, icon: Users },
    { label: "平台总核销数", value: stats?.totalRedemptions, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">Platform command</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">数据总览</h1>
        <p className="mt-2 text-sm text-slate-500">跨商家、门店、活动的全平台运营数据。</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="kpi-card">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-slate-500">{card.label}</p>
                  {isLoading ? (
                    <div className="skeleton-block mt-3 h-8 w-24" />
                  ) : (
                    <p className="mt-2 font-mono text-3xl font-black tracking-tight text-slate-950">
                      {(card.value ?? 0).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-100">
                  <Icon className="size-5 text-slate-700" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="surface-panel">
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-sm text-slate-500">平台核销率</p>
            <p className="mt-2 text-2xl font-semibold">
              {stats ? `${(stats.redemptionRate * 100).toFixed(1)}%` : "..."}
            </p>
          </div>
          <Badge variant="secondary">USED / 全部兑换码</Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="surface-panel">
          <CardHeader>
            <CardTitle>本周新增商家趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendList data={data?.weeklyNewMerchants ?? []} />
          </CardContent>
        </Card>
        <Card className="surface-panel">
          <CardHeader>
            <CardTitle>本周参与人次趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendList data={data?.weeklyParticipations ?? []} />
          </CardContent>
        </Card>
      </div>

      <Card className="surface-panel">
        <CardHeader>
          <CardTitle>Top 10 商家</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-3 pr-4 font-medium">商家</th>
                  <th className="py-3 pr-4 font-medium">参与人次</th>
                  <th className="py-3 pr-4 font-medium">核销数</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topMerchants ?? []).map((merchant) => (
                  <tr key={merchant.merchantId} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">{merchant.merchantName}</td>
                    <td className="py-3 pr-4">{merchant.participants.toLocaleString()}</td>
                    <td className="py-3 pr-4">{merchant.redemptions.toLocaleString()}</td>
                  </tr>
                ))}
                {!isLoading && (data?.topMerchants.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-10">
                      <div className="empty-state">暂无商家排行数据</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
