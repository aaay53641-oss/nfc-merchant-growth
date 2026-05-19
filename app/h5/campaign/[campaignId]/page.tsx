"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Camera, Gift, MapPin, Nfc, ShieldCheck, Sparkles, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchH5Campaign, fetchH5Rewards, fetchH5Tasks } from "@/lib/h5/api";
import { usePageView } from "@/lib/h5/hooks";

const stepCopy = [
  {
    title: "第一关确认到店",
    desc: "点击确认到店，自动记录参与，领取进门礼。",
    reward: "进门礼",
    icon: Nfc,
  },
  {
    title: "第二关图文点评",
    desc: "选平台、选标签和图片，生成真实点评文案。",
    reward: "招牌菜福利",
    icon: Camera,
  },
  {
    title: "第三关内容创作",
    desc: "发布真实体验内容，通过审核后进入霸王餐抽奖。",
    reward: "霸王餐机会",
    icon: Trophy,
  },
];

export default function CampaignPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  usePageView("campaign_home", campaignId);

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["h5-campaign", campaignId],
    queryFn: () => fetchH5Campaign(campaignId),
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["h5-tasks", campaignId],
    queryFn: () => fetchH5Tasks(campaignId),
  });
  const { data: rewards = [] } = useQuery({
    queryKey: ["h5-reward-stock", campaignId],
    queryFn: () => fetchH5Rewards(undefined, campaignId),
  });

  if (isLoading || !campaign) {
    return (
      <div className="-mx-4 -my-4 min-h-screen bg-[#F5F0EB] px-4 py-4">
        <div className="skeleton-block h-64" />
        <div className="mt-4 space-y-3">
          <div className="skeleton-block h-28" />
          <div className="skeleton-block h-28" />
          <div className="skeleton-block h-28" />
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-4 -my-4 min-h-screen bg-[#F5F0EB] px-4 pb-8 pt-4 text-[#1F2937]">
      <section className="relative overflow-hidden rounded-[28px] bg-[#FF5A2C] p-5 text-white shadow-[0_28px_64px_-38px_rgba(255,90,44,0.95)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-white/18" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-amber-200/20" />
        <div className="relative space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-xl font-black text-[#FF5A2C]">
                {campaign.merchant.logo}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm text-orange-50">{campaign.merchant.name}</p>
                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/16 px-2 py-1 text-xs font-semibold ring-1 ring-white/25">
                  <ShieldCheck className="size-3.5" />
                  官方活动
                </div>
              </div>
            </div>
            <Badge className="bg-white text-[#FF5A2C]">3步解锁</Badge>
          </div>

          <div>
            <h1 className="text-[32px] font-black leading-[1.08] tracking-tight">
              60 秒启动 2 关，解锁本店隐藏福利
            </h1>
            <p className="mt-3 text-sm leading-6 text-orange-50">
              本活动由 {campaign.merchant.name} 官方发起，平台提供技术支持。
            </p>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/15 p-3 backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Gift className="size-5" />
              能拿什么：进门礼、招牌菜福利、霸王餐抽奖资格
            </div>
            <p className="mt-2 text-sm leading-6 text-orange-50">怎么用：按步骤完成真实到店体验，到店出示核销码。</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-orange-50">
            <div className="flex items-center gap-1.5">
              <MapPin className="size-4 shrink-0" />
              <span className="truncate">{campaign.merchant.address}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BadgeCheck className="size-4 shrink-0" />
              <span>{campaign.startDate} - {campaign.endDate}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-3">
        {stepCopy.map((step, index) => {
          const Icon = step.icon;
          const task = tasks[index];
          const reward = rewards[index];
          return (
            <article key={step.title} className="rounded-2xl border border-orange-100 bg-white/95 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#FF5A2C]">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-brand-orange">第 {index + 1} 关</span>
                    <Badge variant="secondary" className="h-5 px-2 text-[10px]">{step.reward}</Badge>
                  </div>
                  <h2 className="mt-1 text-base font-black">{task?.shortTitle ?? step.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{step.desc}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    奖励：{reward?.name ?? task?.reward ?? step.reward}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-5 grid gap-3">
        <Button asChild className="h-12 rounded-2xl text-base">
          <Link href={`/h5/campaign/${campaignId}/task/step-1`}>
            开始闯关
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-11 rounded-2xl bg-white">
          <Link href={`/h5/campaign/${campaignId}/rules`}>查看活动规则</Link>
        </Button>
      </section>

      <footer className="mt-6 rounded-2xl bg-white/70 p-3 text-xs leading-5 text-slate-500">
        仅记录任务进度、提交内容、奖励核销状态。
      </footer>
    </div>
  );
}
