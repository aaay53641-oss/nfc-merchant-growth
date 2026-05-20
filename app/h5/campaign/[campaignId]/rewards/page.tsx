"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock3, Gift, Lock, Ticket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { fetchH5AllianceCoupons, fetchH5FlowState, getOrCreateParticipation } from "@/lib/h5/api";
import type { H5FlowState } from "@/lib/h5/types";

const categoryTabs: Array<{
  key: H5FlowState["rewards"][number]["category"];
  label: string;
  icon: typeof Gift;
  empty: string;
}> = [
  { key: "available", label: "可使用", icon: Ticket, empty: "暂无可使用奖励，完成任务后会自动到账。" },
  { key: "pending", label: "待审核", icon: Clock3, empty: "暂无待审核奖励。" },
  { key: "used", label: "已核销", icon: CheckCircle2, empty: "暂无已核销奖励。" },
  { key: "expired", label: "已过期", icon: Lock, empty: "暂无已过期奖励。" },
];

function categoryTone(category: H5FlowState["rewards"][number]["category"]) {
  if (category === "available") return "success" as const;
  if (category === "pending") return "warning" as const;
  if (category === "used") return "muted" as const;
  return "outline" as const;
}

function categoryLabel(category: H5FlowState["rewards"][number]["category"]) {
  return categoryTabs.find((item) => item.key === category)?.label ?? "奖励";
}

function copyCode(code: string) {
  navigator.clipboard.writeText(code);
  toast({ title: "已复制核销码", description: "截图保存核销码，到店出示即可使用。" });
}

export default function RewardsPage() {
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

  const { data: allianceCoupons = [] } = useQuery({
    queryKey: ["allianceCoupons"],
    queryFn: fetchH5AllianceCoupons,
  });

  if (isLoading || !flow) {
    return (
      <div className="space-y-4">
        <div className="skeleton-block h-28" />
        <div className="skeleton-block h-40" />
        <div className="skeleton-block h-40" />
      </div>
    );
  }

  const allApproved = flow.tasks.every((task) => task.status === "APPROVED");

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="absolute -right-12 -top-12 size-36 rounded-full bg-emerald-100" aria-hidden="true" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">Rewards</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">我的奖励</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            奖励按审核、到账、核销和过期状态归类，核销时出示 6 位码。
          </p>
        </div>
      </section>

      {categoryTabs.map((tab) => {
        const Icon = tab.icon;
        const rewards = flow.rewards.filter((reward) => reward.category === tab.key);
        return (
          <section key={tab.key} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="size-4 text-brand-orange" />
                <h3 className="text-sm font-semibold text-slate-950">{tab.label}</h3>
              </div>
              <Badge variant="muted">{rewards.length}</Badge>
            </div>

            {rewards.length === 0 ? (
              <Card className="border-dashed bg-white/80">
                <CardContent className="p-4 text-sm text-slate-500">{tab.empty}</CardContent>
              </Card>
            ) : (
              rewards.map((reward) => (
                <Card key={reward.id} className="tear-coupon border-orange-100 bg-white">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{reward.name}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{reward.description ?? "到店出示核销码即可使用"}</p>
                      </div>
                      <Badge variant={categoryTone(reward.category)}>
                        {categoryLabel(reward.category)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-1 rounded-2xl border border-slate-100 bg-slate-50 p-2 text-center text-[11px] font-semibold text-slate-500">
                      <div className={reward.category === "pending" ? "text-amber-700" : "text-emerald-700"}>审核中</div>
                      <div className={reward.category === "available" || reward.category === "used" ? "text-emerald-700" : ""}>奖励已解锁</div>
                      <div className={reward.redemption ? "text-emerald-700" : ""}>已领取待核销</div>
                    </div>

                    {reward.redemption ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-[1fr_auto] gap-2">
                          <div className="rounded-xl border bg-white px-3 py-2 font-mono text-lg font-black tracking-[0.18em] text-slate-950 shadow-inner">
                            {reward.redemption.code}
                          </div>
                          <Button variant="outline" size="sm" onClick={() => copyCode(reward.redemption!.code)}>
                            复制
                          </Button>
                        </div>
                        <Button asChild className="h-11 w-full rounded-2xl">
                          <Link href={`/h5/campaign/${campaignId}/redeem/${reward.redemption.id}`}>
                            查看完整核销码
                          </Link>
                        </Button>
                        <p className="text-center text-xs text-slate-500">截图保存核销码，到店出示。</p>
                      </div>
                    ) : reward.category === "pending" ? (
                      <Button variant="secondary" className="h-11 w-full rounded-2xl" disabled>
                        门店审核中
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              ))
            )}
          </section>
        );
      })}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-950">联盟优惠券</h3>
          <Badge variant={allApproved ? "success" : "muted"}>
            {allApproved ? "已解锁" : "三关完成后解锁"}
          </Badge>
        </div>
        {allianceCoupons.map((coupon) => (
          <Card key={coupon.id} className={allApproved ? "bg-white/95" : "bg-slate-50"}>
            <CardContent className="flex gap-3 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
                <Ticket className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-950">{coupon.name}</p>
                <p className="mt-1 text-sm text-slate-600">{coupon.partnerName} · {coupon.description}</p>
              </div>
              {allApproved ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Lock className="h-5 w-5 text-slate-400" />}
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
