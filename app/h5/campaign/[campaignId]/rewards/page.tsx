"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Copy, Gift, Lock, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { fetchH5AllianceCoupons, fetchH5Rewards, getOrCreateParticipation, createH5Redemption } from "@/lib/h5/api";
import type { H5Reward } from "@/lib/h5/types";
import { useH5CampaignStore } from "@/store/h5-campaign-store";

export default function RewardsPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const [activeReward, setActiveReward] = useState<H5Reward | null>(null);
  const taskStatus = useH5CampaignStore((state) => state.taskStatus);
  const claimedRewards = useH5CampaignStore((state) => state.claimedRewards);
  const claimReward = useH5CampaignStore((state) => state.claimReward);

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ["h5-rewards", campaignId],
    queryFn: () => fetchH5Rewards(),
  });
  const { data: allianceCoupons = [] } = useQuery({
    queryKey: ["allianceCoupons"],
    queryFn: fetchH5AllianceCoupons,
  });

  const allApproved = taskStatus.l1 === "APPROVED" && taskStatus.l2 === "APPROVED" && taskStatus.l3 === "APPROVED";

  const handleClaim = (reward: H5Reward) => {
    claimReward(campaignId, reward.id);
    setActiveReward(reward);
    toast({ title: "奖励已领取", description: `${reward.name} 的兑换码已生成。` });
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast({ title: "已复制兑换码", description: code });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton-block h-28" />
        <div className="skeleton-block h-40" />
        <div className="skeleton-block h-40" />
      </div>
    );
  }

  const activeCode = activeReward ? claimedRewards[activeReward.id] : "";

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-white/95 p-4 shadow-[0_20px_48px_-36px_rgba(16,185,129,0.65)]">
        <div className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-emerald-100" aria-hidden="true" />
        <div className="relative flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-600 p-2 text-white shadow-[0_16px_30px_-20px_rgba(5,150,105,0.9)]">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-950">奖励领取</h2>
            <p className="mt-1 text-sm text-slate-500">审核通过后自动解锁，领取后出示兑换码核销。</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {rewards.map((reward) => {
          const unlocked = taskStatus[reward.taskId] === "APPROVED";
          const code = claimedRewards[reward.id];

          return (
            <Card key={reward.id} className={`tear-coupon ${unlocked ? "border-emerald-300 bg-white" : "border-slate-200 bg-slate-50"}`}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
                        unlocked ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {unlocked ? <Ticket className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-950">{reward.name}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{reward.description}</p>
                    </div>
                  </div>
                  <Badge variant={code ? "success" : unlocked ? "default" : "muted"}>
                    {code ? "已领取" : unlocked ? "可领取" : "未解锁"}
                  </Badge>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-xs leading-5 text-slate-500">
                  <p>有效期：{reward.validUntil}</p>
                  <p>适用门店：{reward.useStores}</p>
                </div>

                {code ? (
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <div className="rounded-xl border bg-white px-3 py-2 font-mono text-sm font-semibold text-slate-900 shadow-inner">
                      {code}
                    </div>
                    <Button variant="outline" size="icon" onClick={() => copyCode(code)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}

                {unlocked && !code ? (
                  <Button className="h-11 w-full" onClick={() => handleClaim(reward)}>
                    领取兑换码
                  </Button>
                ) : null}

                {!unlocked ? (
                  <Button variant="secondary" className="h-11 w-full" disabled>
                    完成 L{reward.taskId.slice(1)} 后解锁
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-950">联盟优惠券</h3>
          <Badge variant={allApproved ? "success" : "muted"}>
            {allApproved ? "已解锁" : "通关后解锁"}
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

      <Dialog open={Boolean(activeReward)} onOpenChange={(open) => !open && setActiveReward(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>兑换码已生成</DialogTitle>
            <DialogDescription>请到前台出示此码，由店员扫码或手动核销。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-2xl border border-orange-100 bg-[#FFF7F2] p-4 text-center">
              <p className="text-xs text-slate-500">动态兑换码</p>
              <p className="mt-2 break-all font-mono text-xl font-bold text-slate-950">{activeCode}</p>
            </div>
            <div className="mx-auto grid h-36 w-36 grid-cols-5 gap-1 rounded-2xl bg-white p-3 shadow-inner">
              {Array.from({ length: 25 }).map((_, index) => (
                <div
                  key={index}
                  className={`rounded-sm ${index % 2 === 0 || index % 7 === 0 ? "bg-slate-950" : "bg-slate-200"}`}
                />
              ))}
            </div>
            <Button className="h-11 w-full" disabled={!activeCode} onClick={() => activeCode && copyCode(activeCode)}>
              复制兑换码
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
