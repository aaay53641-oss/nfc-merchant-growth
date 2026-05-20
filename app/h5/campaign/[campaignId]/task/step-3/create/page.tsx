"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, ImagePlus, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import type { AICopyResult, CopyPlatform } from "@/lib/ai/copy";
import { fetchH5Campaign, fetchH5CampaignMedia } from "@/lib/h5/api";
import { fileToDataUrl, readStepDraft, step3Platforms, writeStepDraft, type ContentForm, type StepDraft } from "@/lib/h5/three-step";

const formOptions: Array<{ value: ContentForm; label: string }> = [
  { value: "image_text", label: "图文" },
  { value: "video", label: "视频" },
  { value: "moments", label: "朋友圈" },
];

async function requestAICopy(input: {
  storeName: string;
  platform: CopyPlatform;
  contentForm: ContentForm;
  selectedImages: string[];
  dishNames: string[];
  userFeeling: string;
}) {
  const response = await fetch("/api/ai/copy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storeName: input.storeName,
      cuisineType: input.contentForm === "video" ? "探店视频" : "真实探店",
      signatureDishes: input.dishNames.length ? input.dishNames : ["招牌菜", "门店环境"],
      environmentStyle: input.selectedImages.length ? "有现场图片素材" : "真实自然",
      platform: input.platform,
      style: input.contentForm === "moments" ? "friend_gathering" : "foodie_review",
      userFeeling: input.contentForm === "video"
        ? `${input.userFeeling}。请补充 15 秒视频脚本。`
        : input.userFeeling,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "生成失败");
  return data as AICopyResult;
}

export default function Step3CreatePage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.campaignId as string;
  const [platform, setPlatform] = useState(step3Platforms[0]);
  const [contentForm, setContentForm] = useState<ContentForm>("image_text");
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [localImages, setLocalImages] = useState<string[]>([]);
  const [dishNames, setDishNames] = useState("毛肚、鸭肠、红油锅底");
  const [userFeeling, setUserFeeling] = useState("热闹、有烟火气，适合朋友聚餐");
  const [generatedDraft, setGeneratedDraft] = useState<StepDraft | null>(null);

  const { data: campaign } = useQuery({
    queryKey: ["h5-campaign", campaignId],
    queryFn: () => fetchH5Campaign(campaignId),
  });
  const { data: merchantMedia = [] } = useQuery({
    queryKey: ["h5-media", campaignId, 3, platform.platform],
    queryFn: () => fetchH5CampaignMedia({ campaignId, step: 3, platform: platform.platform, mediaType: "IMAGE" }),
  });

  const selectedImages = useMemo(() => {
    const merchant = merchantMedia
      .filter((item) => selectedMediaIds.includes(item.id))
      .map((item) => ({
        id: item.id,
        url: item.url,
        title: item.title,
        category: item.category,
        source: "merchant" as const,
      }));
    const local = localImages.map((url, index) => ({
      id: `local-${index}`,
      url,
      title: "真实体验画面",
      category: "现场拍摄",
      source: "local" as const,
    }));
    return [...merchant, ...local];
  }, [localImages, merchantMedia, selectedMediaIds]);

  useEffect(() => {
    setGeneratedDraft(readStepDraft(campaignId, 3));
  }, [campaignId]);

  const aiMutation = useMutation({
    mutationFn: requestAICopy,
    onSuccess: (copy) => {
      const draft: StepDraft = {
        platform: platform.platform,
        platformName: platform.label,
        jumpUrl: platform.url,
        tags: [],
        images: selectedImages,
        title: copy.title,
        content: copy.content,
        aiTags: copy.tags,
        userFeeling,
        contentForm,
      };
      writeStepDraft(campaignId, 3, draft);
      setGeneratedDraft(draft);
      toast({ title: "第三关内容已生成", description: "请按真实体验修改后发布。" });
    },
    onError: (error) => {
      toast({ title: "生成失败", description: error instanceof Error ? error.message : "请稍后重试" });
    },
  });

  const handleLocalImages = async (files: FileList | null) => {
    if (!files) return;
    setLocalImages(await Promise.all(Array.from(files).slice(0, 5).map(fileToDataUrl)));
  };

  const generate = () => {
    if (selectedImages.length < 1) {
      toast({ title: "至少加入 1 个真实体验画面" });
      return;
    }
    aiMutation.mutate({
      storeName: campaign?.merchant.name ?? "门店",
      platform: platform.platform,
      contentForm,
      selectedImages: selectedImages.map((item) => item.url),
      dishNames: dishNames.split(/[、,，\n]/).map((item) => item.trim()).filter(Boolean),
      userFeeling,
    });
  };

  return (
    <div className="-mx-4 -my-4 min-h-screen bg-[#F5F0EB] px-4 pb-8 pt-4">
      <section className="rounded-[28px] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-orange">Create</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">第三关 AI 创作</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">选择内容形式和素材，生成标题、正文、标签和视频脚本。</p>
      </section>

      <Card className="mt-4 border-orange-100 bg-white">
        <CardContent className="space-y-4 p-4">
          <div className="grid grid-cols-3 gap-2">
            {formOptions.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setContentForm(item.value)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${contentForm === item.value ? "bg-[#FF5A2C] text-white" : "bg-slate-100 text-slate-600"}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="grid gap-2">
            {step3Platforms.map((item) => (
              <button
                key={item.platform}
                type="button"
                onClick={() => setPlatform(item)}
                className={`rounded-2xl border p-3 text-left ${platform.platform === item.platform ? "border-brand-orange bg-orange-50" : "border-slate-100 bg-white"}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{item.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.hint}</p>
                  </div>
                  {platform.platform === item.platform ? <Check className="size-5 text-brand-orange" /> : null}
                </div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {merchantMedia.map((media) => {
              const active = selectedMediaIds.includes(media.id);
              return (
                <button
                  key={media.id}
                  type="button"
                  onClick={() => setSelectedMediaIds((current) => active ? current.filter((id) => id !== media.id) : [...current, media.id])}
                  className={`relative aspect-square rounded-2xl border bg-cover bg-center ${active ? "border-brand-orange ring-2 ring-orange-100" : "border-slate-100"}`}
                  style={{ backgroundImage: `url(${media.url})` }}
                  aria-label={media.title ?? "商家素材"}
                />
              );
            })}
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-orange-200 bg-orange-50 text-xs text-brand-orange">
              <ImagePlus className="mb-1 size-5" />
              现场拍摄
              <input type="file" accept="image/*,video/*" capture="environment" multiple className="hidden" onChange={(event) => handleLocalImages(event.target.files)} />
            </label>
          </div>

          <Input value={dishNames} onChange={(event) => setDishNames(event.target.value)} placeholder="适用菜品" />
          <Input value={userFeeling} onChange={(event) => setUserFeeling(event.target.value)} placeholder="真实体验感受" />
          <Button className="h-12 w-full rounded-2xl" disabled={aiMutation.isPending} onClick={generate}>
            <Sparkles className="size-4" />
            {aiMutation.isPending ? "生成中..." : generatedDraft ? "重新生成第三关内容" : "生成第三关内容"}
          </Button>
        </CardContent>
      </Card>

      {generatedDraft ? (
        <Card className="mt-4 border-orange-100 bg-white">
          <CardContent className="space-y-4 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-orange">AI result</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">{generatedDraft.title}</h2>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{generatedDraft.content}</p>
            {generatedDraft.contentForm === "video" ? (
              <div className="rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                <p className="font-semibold text-slate-950">视频脚本提示</p>
                <p className="mt-1">按门头 3 秒、招牌菜 6 秒、桌面全景 6 秒拍摄，再用上方正文做口播参考。</p>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {generatedDraft.aiTags.map((tag) => (
                <span key={tag} className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-brand-orange">
                  #{tag.replace(/^#/, "")}
                </span>
              ))}
            </div>
            <Button className="h-12 w-full rounded-2xl" onClick={() => router.push(`/h5/campaign/${campaignId}/task/step-3/submit`)}>
              去提交第三关审核
              <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
