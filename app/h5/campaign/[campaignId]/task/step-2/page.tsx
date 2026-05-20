"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Camera, Check, ImagePlus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import type { AICopyResult } from "@/lib/ai/copy";
import { fetchH5Campaign, fetchH5CampaignMedia } from "@/lib/h5/api";
import { fileToDataUrl, reviewPlatforms, step2Tags, writeStepDraft } from "@/lib/h5/three-step";

type ImageSource = "camera" | "merchant" | "album";

async function requestAICopy(input: {
  storeName: string;
  platform: string;
  selectedTags: string[];
  selectedImages: string[];
  dishNames: string[];
  userFeeling: string;
}) {
  const response = await fetch("/api/ai/copy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storeName: input.storeName,
      cuisineType: "门店点评",
      signatureDishes: input.dishNames.length ? input.dishNames : input.selectedTags.slice(0, 3),
      environmentStyle: input.selectedTags.join("、"),
      platform: input.platform,
      style: "real_experience",
      userFeeling: input.userFeeling,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "生成失败");
  return data as AICopyResult;
}

export default function Step2Page() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.campaignId as string;
  const [platform, setPlatform] = useState(reviewPlatforms[0]);
  const [selectedTags, setSelectedTags] = useState<string[]>(["口味不错", "服务挺好"]);
  const [selectedMerchantMedia, setSelectedMerchantMedia] = useState<string[]>([]);
  const [localImages, setLocalImages] = useState<string[]>([]);
  const [imageSource, setImageSource] = useState<ImageSource>("camera");
  const [dishNames, setDishNames] = useState("毛肚、鸭肠、红油锅底");
  const [userFeeling, setUserFeeling] = useState("辣得很过瘾，适合朋友小聚");

  const { data: campaign } = useQuery({
    queryKey: ["h5-campaign", campaignId],
    queryFn: () => fetchH5Campaign(campaignId),
  });
  const { data: merchantMedia = [] } = useQuery({
    queryKey: ["h5-media", campaignId, 2, platform.platform],
    queryFn: () => fetchH5CampaignMedia({ campaignId, step: 2, platform: platform.platform, mediaType: "IMAGE" }),
  });

  const selectedImages = useMemo(() => {
    const media = merchantMedia
      .filter((item) => selectedMerchantMedia.includes(item.id))
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
      title: "现场图片",
      category: "现场拍摄",
      source: "local" as const,
    }));
    return [...media, ...local];
  }, [localImages, merchantMedia, selectedMerchantMedia]);

  const mediaGroups = useMemo(() => {
    return merchantMedia.reduce<Record<string, typeof merchantMedia>>((groups, media) => {
      const key = media.category || "其他";
      groups[key] = [...(groups[key] ?? []), media];
      return groups;
    }, {});
  }, [merchantMedia]);

  const aiMutation = useMutation({
    mutationFn: requestAICopy,
    onSuccess: (copy) => {
      writeStepDraft(campaignId, 2, {
        platform: platform.platform,
        platformName: platform.platformName,
        jumpUrl: platform.jumpUrl,
        tags: selectedTags,
        images: selectedImages,
        title: copy.title,
        content: copy.content,
        aiTags: copy.tags,
        userFeeling,
      });
      toast({ title: "点评文案已生成", description: "请按真实体验修改后发布。" });
      router.push(`/h5/campaign/${campaignId}/task/step-2/result`);
    },
    onError: (error) => {
      toast({ title: "生成失败", description: error instanceof Error ? error.message : "请稍后重试" });
    },
  });

  const toggleTag = (tag: string) => {
    setSelectedTags((current) => {
      if (current.includes(tag)) return current.filter((item) => item !== tag);
      if (current.length >= 5) {
        toast({ title: "最多选择 5 个标签" });
        return current;
      }
      return [...current, tag];
    });
  };

  const handleLocalImages = async (files: FileList | null) => {
    if (!files) return;
    const next = await Promise.all(Array.from(files).slice(0, 4).map(fileToDataUrl));
    setLocalImages(next);
  };

  const generate = () => {
    if (selectedTags.length < 2) {
      toast({ title: "至少选择 2 个体验标签" });
      return;
    }
    if (selectedImages.length < 1) {
      toast({ title: "至少选择 1 张图片", description: "建议包含菜品、桌面、门头或店内环境。" });
      return;
    }
    aiMutation.mutate({
      storeName: campaign?.merchant.name ?? "门店",
      platform: platform.copyPlatform,
      selectedTags,
      selectedImages: selectedImages.map((item) => item.url),
      dishNames: dishNames.split(/[、,，\n]/).map((item) => item.trim()).filter(Boolean),
      userFeeling,
    });
  };

  return (
    <div className="-mx-4 -my-4 min-h-screen bg-[#F5F0EB] px-4 pb-8 pt-4">
      <section className="rounded-[28px] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-orange">Step 2</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">第 2 步：选择平台，生成真实点评</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">至少选择 2 个体验标签和 1 张图片，文案仅供参考，请按真实体验修改。</p>
      </section>

      <section className="mt-4 grid gap-3">
        {reviewPlatforms.map((item) => (
          <button
            key={item.platform}
            type="button"
            onClick={() => setPlatform(item)}
            className={`rounded-2xl border p-4 text-left transition ${
              platform.platform === item.platform
                ? "border-brand-orange bg-orange-50 text-brand-orange-deep"
                : "border-slate-100 bg-white text-slate-700"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{item.platformName}</p>
                <p className="mt-1 text-xs text-slate-500">{item.copyStyle} · {item.imageRequired ? "需图片" : "可选图片"}</p>
              </div>
              {platform.platform === item.platform ? <Check className="size-5" /> : null}
            </div>
          </button>
        ))}
      </section>

      <Card className="mt-4 border-orange-100 bg-white/95">
        <CardContent className="space-y-4 p-4">
          <div>
            <h2 className="font-semibold">体验标签</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {step2Tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-3 py-2 text-sm transition ${
                    selectedTags.includes(tag)
                      ? "bg-[#FF5A2C] text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">图片选择</h2>
              <Badge variant="secondary">{selectedImages.length} 张</Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500">建议至少包含 1 张现场图：菜品 / 桌面 / 门头 / 店内环境。</p>
            <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1 text-xs font-semibold text-slate-500">
              {[
                ["camera", "现场拍摄"],
                ["merchant", "商家推荐图"],
                ["album", "相册选择"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setImageSource(value as ImageSource)}
                  className={`rounded-xl px-2 py-2 transition ${
                    imageSource === value ? "bg-white text-brand-orange shadow-sm" : ""
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-3">
              {imageSource === "camera" ? (
                <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-orange-200 bg-orange-50 text-center text-sm text-brand-orange">
                  <Camera className="mb-2 size-7" />
                  现场拍摄菜品、桌面、门头或店内环境
                  <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(event) => handleLocalImages(event.target.files)} />
                </label>
              ) : null}

              {imageSource === "merchant" ? (
                <div className="space-y-4">
                  {Object.keys(mediaGroups).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      门店暂未配置推荐图，可以使用现场拍摄或相册选择。
                    </div>
                  ) : (
                    Object.entries(mediaGroups).map(([category, items]) => (
                      <div key={category}>
                        <p className="mb-2 text-xs font-semibold text-slate-500">{category}</p>
                        <div className="grid grid-cols-3 gap-2">
                          {items.map((media) => {
                            const active = selectedMerchantMedia.includes(media.id);
                            return (
                              <button
                                key={media.id}
                                type="button"
                                onClick={() => setSelectedMerchantMedia((current) =>
                                  active ? current.filter((id) => id !== media.id) : [...current, media.id]
                                )}
                                className={`relative aspect-square overflow-hidden rounded-2xl border bg-cover bg-center ${
                                  active ? "border-brand-orange ring-2 ring-orange-100" : "border-slate-100"
                                }`}
                                style={{ backgroundImage: `url(${media.url})` }}
                                aria-label={media.title ?? "商家推荐图"}
                              >
                                {active ? <span className="absolute right-2 top-2 rounded-full bg-[#FF5A2C] p-1 text-white"><Check className="size-3" /></span> : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : null}

              {imageSource === "album" ? (
                <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm text-slate-500">
                  <ImagePlus className="mb-2 size-7" />
                  从相册选择已拍好的图片
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => handleLocalImages(event.target.files)} />
                </label>
              ) : null}
            </div>

            {localImages.length > 0 ? (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {localImages.map((url, index) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={`${url}-${index}`} src={url} alt="已选择图片" className="aspect-square rounded-xl object-cover" />
                ))}
              </div>
            ) : null}
          </div>

          <Input value={dishNames} onChange={(event) => setDishNames(event.target.value)} placeholder="招牌菜，如毛肚、鸭肠、红油锅底" />
          <Input value={userFeeling} onChange={(event) => setUserFeeling(event.target.value)} placeholder="真实感受，如辣得很过瘾" />

          <Button className="h-12 w-full rounded-2xl" disabled={aiMutation.isPending} onClick={generate}>
            <Sparkles className="size-4" />
            {aiMutation.isPending ? "生成中..." : "生成点评文案"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
