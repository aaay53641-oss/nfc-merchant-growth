"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Clock, Gift, Sparkles, Trophy, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchH5FlowState, getOrCreateParticipation } from "@/lib/h5/api";

function statusText(status?: string | null) {
  if (status === "WON") return "已中奖";
  if (status === "LOST") return "未中奖";
  if (status === "CANCELLED") return "已取消";
  return "等待开奖";
}

export default function LotteryPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;

  const { data: participationInfo } = useQuery({
    queryKey: ["h5-participation", campaignId],
    queryFn: () => getOrCreateParticipation(campaignId),
  });

  const { data: flow, isLoading } = useQuery({
    queryKey: ["h5-flow-state", participationInfo?.participationId],
    queryFn: () => fetchH5FlowState(participationInfo!.participationId),
    enabled: Boolean(participationInfo?.participationId),
  });

  const entry = flow?.lottery.entry;
  const chances = entry?.weight ?? 0;

  if (isLoading || !flow) {
    return (
      <div className="space-y-4">
        <div className="skeleton-block h-36" />
        <div className="skeleton-block h-48" />
      </div>
    );
  }

  return (
    <div className="-mx-4 -my-4 min-h-screen bg-[#F5F0EB] px-4 pb-8 pt-4">
      <section className="relative overflow-hidden rounded-[30px] bg-slate-950 p-5 text-white shadow-[0_24px_60px_-42px_rgba(15,23,42,0.8)]">
        <div className="absolute -right-12 -top-12 size-36 rounded-full bg-[#FF5A2C]/30" aria-hidden="true" />
        <div className="relative">
          <Badge className="border-white/20 bg-white/10 text-white shadow-none">
            霸王餐抽奖
          </Badge>
          <h1 className="mt-4 text-3xl font-black">我的抽奖资格</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            内容越清晰完整，审核通过后可能获得更多抽奖机会。
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/10 p-3">
              <Trophy className="mb-2 size-5 text-orange-200" />
              <p className="text-2xl font-black">{flow.lottery.todayQuota}</p>
              <p className="text-[11px] text-slate-300">今日名额</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <Users className="mb-2 size-5 text-orange-200" />
              <p className="text-2xl font-black">{flow.lottery.poolCount}</p>
              <p className="text-[11px] text-slate-300">入池人数</p>
            </div>
            <div className="rounded-2xl bg-[#FF5A2C] p-3">
              <Sparkles className="mb-2 size-5 text-white" />
              <p className="text-2xl font-black">{chances}</p>
              <p className="text-[11px] text-orange-50">我的机会</p>
            </div>
          </div>
        </div>
      </section>

      <Card className="mt-4 border-orange-100 bg-white">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">当前状态</p>
              <p className="mt-1 text-xs text-slate-500">审核通过后自动进入抽奖池</p>
            </div>
            <Badge variant={chances > 0 ? "success" : "warning"}>
              {chances > 0 ? statusText(entry?.status) : "待审核"}
            </Badge>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-white text-brand-orange shadow-sm">
                <Clock className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">开奖时间</p>
                <p className="mt-1 text-sm text-slate-600">{flow.lottery.drawTime ?? "以门店通知为准"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm leading-6 text-slate-700">
            <p className="font-semibold text-slate-950">资格规则</p>
            <p className="mt-1">第三关质量审核达到 {flow.lottery.minScore} 分即可入池；60-79 分 1 次机会，80 分以上 2-3 次机会。</p>
          </div>

          <Button asChild className="h-12 w-full rounded-2xl">
            <Link href={`/h5/campaign/${campaignId}/rewards`}>
              <Gift className="size-4" />
              查看我的奖励
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
