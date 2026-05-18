"use client";

import { AlertCircle, MessageCircle, Music2, Star, Utensils } from "lucide-react";

import { Badge } from "@/components/ui/badge";

const tutorials = [
  {
    platform: "抖音",
    icon: Music2,
    steps: ["打开抖音「我的」", "进入已发布作品", "长按视频或点分享", "选择复制链接"],
  },
  {
    platform: "小红书",
    icon: Star,
    steps: ["打开对应笔记", "点击右上角分享", "选择复制链接", "回到本页粘贴"],
  },
  {
    platform: "大众点评",
    icon: Utensils,
    steps: ["进入「我的」", "找到「评价」", "打开对应评价", "复制评价链接"],
  },
  {
    platform: "朋友圈",
    icon: MessageCircle,
    steps: ["长按已发布内容", "尝试复制链接", "若无法复制", "改用截图上传"],
  },
];

export function LinkTutorialContent({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-3">
        <div className="flex gap-2 text-sm leading-6 text-slate-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
          <p>优先复制公开发布链接；如果平台不支持复制，直接上传截图即可。</p>
        </div>
      </div>

      <div className="space-y-3">
        {tutorials.map((item) => {
          const Icon = item.icon;
          return (
            <section key={item.platform} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-slate-950">{item.platform}</h3>
                </div>
                {item.platform === "朋友圈" ? <Badge variant="warning">有限制</Badge> : <Badge variant="secondary">推荐</Badge>}
              </div>
              <div className="mt-3 grid gap-2">
                {item.steps.map((step, index) => (
                  <div key={step} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-50 text-xs font-bold text-brand-orange">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
