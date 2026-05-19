"use client";

import { useParams, useRouter } from "next/navigation";
import { Copy, Download, ExternalLink, FileCheck2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { readStepDraft, type StepDraft } from "@/lib/h5/three-step";

export default function Step2ResultPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.campaignId as string;
  const [draft, setDraft] = useState<StepDraft | null>(null);

  useEffect(() => {
    setDraft(readStepDraft(campaignId, 2));
  }, [campaignId]);

  const copyText = async () => {
    if (!draft) return;
    const text = `${draft.title}\n\n${draft.content}\n\n${draft.aiTags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ")}`;
    await navigator.clipboard.writeText(text);
    toast({ title: "文案已复制", description: "请按真实体验修改后发布。" });
  };

  const saveImages = () => {
    if (!draft?.images.length) return;
    draft.images.forEach((image, index) => {
      const link = document.createElement("a");
      link.href = image.url;
      link.download = `review-image-${index + 1}.jpg`;
      link.click();
    });
    toast({ title: "图片已保存", description: "如浏览器拦截，请长按图片保存。" });
  };

  const openPlatform = () => {
    if (!draft) return;
    const opened = window.open(draft.jumpUrl, "_blank", "noopener,noreferrer");
    if (!opened) toast({ title: "跳转失败请手动打开 App" });
  };

  if (!draft) {
    return (
      <div className="rounded-2xl bg-white p-5 text-center">
        <p className="text-sm text-slate-500">未找到生成内容，请返回重新生成。</p>
        <Button className="mt-4" onClick={() => router.push(`/h5/campaign/${campaignId}/task/step-2`)}>
          返回第二关
        </Button>
      </div>
    );
  }

  return (
    <div className="-mx-4 -my-4 min-h-screen bg-[#F5F0EB] px-4 pb-8 pt-4">
      <section className="rounded-[28px] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-orange">Step 2 result</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">点评内容已生成</h1>
          </div>
          <Badge variant="secondary">{draft.platformName}</Badge>
        </div>
        <p className="mt-3 rounded-2xl bg-orange-50 p-3 text-xs leading-5 text-brand-orange-deep">
          文案图片仅供参考，请按真实到店体验修改后发布，不要求固定好评。
        </p>
      </section>

      <section className="mt-4 rounded-2xl bg-white p-4">
        <h2 className="text-lg font-black text-slate-950">{draft.title}</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{draft.content}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {draft.aiTags.map((tag) => (
            <Badge key={tag} variant="muted">#{tag.replace(/^#/, "")}</Badge>
          ))}
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-2">
        {draft.images.map((image) => (
          <div
            key={image.id}
            className="aspect-square rounded-2xl bg-cover bg-center"
            style={{ backgroundImage: `url(${image.url})` }}
            aria-label={image.title ?? "已选择图片"}
          />
        ))}
      </section>

      <section className="mt-5 grid gap-3">
        <Button className="h-12 rounded-2xl" onClick={copyText}><Copy className="size-4" />复制文案</Button>
        <Button variant="outline" className="h-12 rounded-2xl bg-white" onClick={saveImages}><Download className="size-4" />保存图片</Button>
        <Button variant="outline" className="h-12 rounded-2xl bg-white" onClick={openPlatform}><ExternalLink className="size-4" />去 {draft.platformName} 发布</Button>
        <Button className="h-12 rounded-2xl" onClick={() => router.push(`/h5/campaign/${campaignId}/task/step-2/submit`)}>
          <FileCheck2 className="size-4" />
          我已发布，去确认
        </Button>
      </section>
    </div>
  );
}
