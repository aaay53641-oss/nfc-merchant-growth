"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Film, Gift, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Step3Page() {
  const params = useParams();
  const campaignId = params.campaignId as string;

  return (
    <div className="-mx-4 -my-4 min-h-screen bg-[#F5F0EB] px-4 pb-8 pt-4">
      <section className="rounded-[28px] bg-white p-5 shadow-sm">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-orange-50 text-[#FF5A2C]">
          <Film className="size-7" />
        </div>
        <h1 className="mt-4 text-2xl font-black text-slate-950">第 3 步：发布真实体验，抽霸王餐</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          发布清晰完整真实的图文或视频内容，通过审核后获得霸王餐抽奖资格。
        </p>
      </section>

      <section className="mt-4 grid gap-3">
        <div className="rounded-2xl bg-white p-4">
          <Sparkles className="size-5 text-brand-orange" />
          <h2 className="mt-2 font-semibold text-slate-950">内容越完整，抽奖机会越高</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">60 分以下不通过，60-79 分 1 次机会，80 分以上 2-3 次机会。</p>
        </div>
        <div className="rounded-2xl bg-white p-4">
          <Gift className="size-5 text-brand-orange" />
          <h2 className="mt-2 font-semibold text-slate-950">先看拍摄模板</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">门头、招牌菜、桌面全景和真实感受，是通过审核的关键。</p>
        </div>
      </section>

      <section className="mt-5 grid gap-3">
        <Button asChild className="h-12 rounded-2xl">
          <Link href={`/h5/campaign/${campaignId}/task/step-3/guide`}>
            查看拍摄指导 <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-12 rounded-2xl bg-white">
          <Link href={`/h5/campaign/${campaignId}/task/step-3/create`}>直接开始创作</Link>
        </Button>
      </section>
    </div>
  );
}
