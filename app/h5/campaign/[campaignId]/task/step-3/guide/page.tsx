"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Camera, Images, Video } from "lucide-react";

import { Button } from "@/components/ui/button";

const videoTemplate = ["镜头1：门头 3 秒", "镜头2：招牌菜 6 秒", "镜头3：桌面全景 6 秒"];
const imageTemplate = ["图1 门头或环境", "图2 招牌菜", "图3 桌面全景", "图4 菜单活动", "图5 个人细节"];
const platformTips = ["小红书 4-6 张图", "抖音 8-30 秒视频", "视频号自然真实", "朋友圈 1-3 张 + 感受", "B站完整视频"];

export default function Step3GuidePage() {
  const params = useParams();
  const campaignId = params.campaignId as string;

  return (
    <div className="-mx-4 -my-4 min-h-screen bg-[#F5F0EB] px-4 pb-8 pt-4">
      <section className="rounded-[28px] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-orange">Guide</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">第三关拍摄指导</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">建议至少加入 1 个真实体验画面，内容更容易通过审核。</p>
      </section>

      <section className="mt-4 space-y-3">
        <div className="rounded-2xl bg-white p-4">
          <div className="flex items-center gap-2 font-semibold text-slate-950"><Video className="size-5 text-brand-orange" />15 秒视频模板</div>
          <div className="mt-3 grid gap-2">
            {videoTemplate.map((item) => <p key={item} className="rounded-xl bg-orange-50 p-3 text-sm text-brand-orange-deep">{item}</p>)}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4">
          <div className="flex items-center gap-2 font-semibold text-slate-950"><Images className="size-5 text-brand-orange" />图文模板</div>
          <div className="mt-3 grid gap-2">
            {imageTemplate.map((item) => <p key={item} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{item}</p>)}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4">
          <div className="flex items-center gap-2 font-semibold text-slate-950"><Camera className="size-5 text-brand-orange" />平台差异建议</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {platformTips.map((item) => <span key={item} className="rounded-full bg-slate-100 px-3 py-2 text-xs text-slate-600">{item}</span>)}
          </div>
        </div>
      </section>

      <Button asChild className="mt-5 h-12 w-full rounded-2xl">
        <Link href={`/h5/campaign/${campaignId}/task/step-3/create`}>
          开始创作 <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
