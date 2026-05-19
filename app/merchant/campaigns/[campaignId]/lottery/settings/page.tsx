"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Save, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";

type LotterySettings = {
  campaignId: string;
  lotteryDailyQuota: number;
  lotteryDrawTime: string | null;
  lotteryMinScore: number;
  lotteryActive: boolean;
};

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) throw new Error(body?.error ?? "请求失败");
  return body.data as T;
}

export default function LotterySettingsPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const queryClient = useQueryClient();
  const endpoint = `/api/merchant/campaigns/${campaignId}/lottery/settings`;
  const [form, setForm] = useState<LotterySettings>({
    campaignId,
    lotteryDailyQuota: 3,
    lotteryDrawTime: "21:30",
    lotteryMinScore: 60,
    lotteryActive: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["merchant-lottery-settings", campaignId],
    queryFn: () => apiRequest<{ settings: LotterySettings }>(endpoint),
  });

  useEffect(() => {
    if (data?.settings) setForm(data.settings);
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => apiRequest<{ settings: LotterySettings }>(endpoint, {
      method: "PATCH",
      body: JSON.stringify({
        lotteryDailyQuota: form.lotteryDailyQuota,
        lotteryDrawTime: form.lotteryDrawTime,
        lotteryMinScore: form.lotteryMinScore,
        lotteryActive: form.lotteryActive,
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-lottery-settings", campaignId] });
      toast({ title: "抽奖配置已保存" });
    },
    onError: (error) => {
      toast({ title: "保存失败", description: error instanceof Error ? error.message : "请稍后重试" });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">霸王餐配置</h1>
        <p className="mt-1 text-sm text-slate-500">配置每日名额、开奖时间、最低审核分和是否启用抽奖。</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">抽奖规则</CardTitle>
          <Badge variant={form.lotteryActive ? "success" : "muted"}>
            {form.lotteryActive ? "已启用" : "未启用"}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {isLoading ? (
            <p className="text-sm text-slate-500 md:col-span-2">加载配置中...</p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>每日名额</Label>
                <Input type="number" min={0} value={form.lotteryDailyQuota} onChange={(event) => setForm((current) => ({ ...current, lotteryDailyQuota: Number(event.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>开奖时间</Label>
                <Input value={form.lotteryDrawTime ?? ""} onChange={(event) => setForm((current) => ({ ...current, lotteryDrawTime: event.target.value }))} placeholder="21:30" />
              </div>
              <div className="space-y-2">
                <Label>最低审核分</Label>
                <Input type="number" min={0} max={100} value={form.lotteryMinScore} onChange={(event) => setForm((current) => ({ ...current, lotteryMinScore: Number(event.target.value) }))} />
              </div>
              <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                <input type="checkbox" checked={form.lotteryActive} onChange={(event) => setForm((current) => ({ ...current, lotteryActive: event.target.checked }))} />
                启用霸王餐抽奖
              </label>
              <div className="rounded-2xl bg-orange-50 p-4 text-sm leading-6 text-slate-700 md:col-span-2">
                <div className="flex items-center gap-2 font-semibold text-slate-950">
                  <Trophy className="size-4 text-brand-orange" />
                  资格线
                </div>
                <p className="mt-1">60-79 分默认 1 次机会；80-89 分 2 次机会；90-100 分 3 次机会。低于配置分数不进入抽奖池。</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="size-4" />
                  开奖和中奖通知为后续能力，本阶段先完成资格入池和状态展示。
                </div>
              </div>
              <Button className="md:col-span-2" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
                <Save className="size-4" />
                {mutation.isPending ? "保存中..." : "保存配置"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
