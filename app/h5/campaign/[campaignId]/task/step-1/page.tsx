"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Gift, Nfc, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { checkInParticipation, fetchH5Campaign, getOrCreateParticipation } from "@/lib/h5/api";
import { useH5CampaignStore } from "@/store/h5-campaign-store";

export default function Step1Page() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.campaignId as string;
  const approveTask = useH5CampaignStore((state) => state.approveTask);

  const { data: campaign } = useQuery({
    queryKey: ["h5-campaign", campaignId],
    queryFn: () => fetchH5Campaign(campaignId),
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const participation = await getOrCreateParticipation(campaignId);
      return checkInParticipation(participation.participationId);
    },
    onSuccess: () => {
      approveTask("l1");
      toast({ title: "进门礼已到账", description: "可在“我的奖励”查看核销码。" });
      router.push(`/h5/campaign/${campaignId}/task/step-2`);
    },
    onError: (error) => {
      toast({
        title: "确认失败",
        description: error instanceof Error ? error.message : "请稍后重试",
      });
    },
  });

  return (
    <div className="-mx-4 -my-4 min-h-screen bg-[#F5F0EB] px-4 pb-8 pt-4">
      <section className="rounded-[28px] bg-white p-5 shadow-[0_26px_60px_-42px_rgba(31,41,55,0.7)]">
        <div className="flex items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-orange-50 text-[#FF5A2C]">
            <Nfc className="size-7" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-orange">Step 1</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">第 1 步：确认到店，领取进门礼</h1>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-orange-100 bg-[#FFF7F2] p-4 text-sm leading-6 text-slate-700">
          点击确认后系统记录参与，立即解锁进门礼。不要求手机号、不要求截图、不跳外部平台。
        </div>

        <div className="mt-5 grid gap-3">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <ShieldCheck className="size-5 text-emerald-600" />
            <span className="text-sm text-slate-700">本活动由 {campaign?.merchant.name ?? "门店"} 官方发起</span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <Gift className="size-5 text-brand-orange" />
            <span className="text-sm text-slate-700">完成提示：进门礼已到账，可在“我的奖励”查看核销码</span>
          </div>
        </div>

        <Button
          className="mt-6 h-12 w-full rounded-2xl text-base"
          disabled={checkInMutation.isPending}
          onClick={() => checkInMutation.mutate()}
        >
          {checkInMutation.isPending ? "确认中..." : "确认到店，领取福利"}
          {checkInMutation.isPending ? null : <ArrowRight className="size-4" />}
        </Button>
      </section>

      <div className="mt-4 rounded-2xl bg-white/80 p-4 text-sm leading-6 text-slate-600">
        <div className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
          <CheckCircle2 className="size-4 text-emerald-600" />
          自动通过规则
        </div>
        店员可直接引导用户点击确认，到店信息只用于活动进度和奖励核销。
      </div>
    </div>
  );
}
