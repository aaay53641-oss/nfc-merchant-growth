"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { usePageView } from "@/lib/h5/hooks";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Copy, ExternalLink, ImagePlus, Loader2, Sparkles, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import type { AICopyResult, CopyPlatform, CopyStyle } from "@/lib/ai/copy";
import { fetchH5Campaign } from "@/lib/h5/api";
import type { GeneratedCopy } from "@/lib/h5/types";
import { useH5CampaignStore } from "@/store/h5-campaign-store";

const platformOptions: Array<{ value: CopyPlatform; label: string; hint: string; launchUrl: string }> = [
  {
    value: "xiaohongshu",
    label: "小红书",
    hint: "标题抓眼，标签更完整",
    launchUrl: "https://www.xiaohongshu.com",
  },
  {
    value: "douyin",
    label: "抖音",
    hint: "适合短视频口播和画面脚本",
    launchUrl: "https://www.douyin.com",
  },
  {
    value: "dianping",
    label: "大众点评",
    hint: "真实评价口吻，避免夸张营销",
    launchUrl: "https://www.dianping.com",
  },
  {
    value: "weixin_moments",
    label: "朋友圈",
    hint: "自然分享，适合熟人社交",
    launchUrl: "https://weixin.qq.com",
  },
];

const styleOptions: Array<{ value: CopyStyle; label: string }> = [
  { value: "vibe", label: "氛围感" },
  { value: "deal_hunter", label: "性价比" },
  { value: "foodie_review", label: "探店风" },
  { value: "real_experience", label: "真实体验" },
  { value: "date_night", label: "约会聚餐" },
  { value: "friend_gathering", label: "朋友聚会" },
];

const platformLabel = Object.fromEntries(platformOptions.map((item) => [item.value, item.label])) as Record<
  CopyPlatform,
  string
>;

interface CopyApiError {
  error?: string;
  details?: unknown;
}

function splitSignatureDishes(value: string) {
  return value
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function formatCopyForClipboard(copy: GeneratedCopy) {
  const tags = copy.tags.length ? `\n\n${copy.tags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ")}` : "";
  return `${copy.title}\n\n${copy.content}${tags}`;
}

async function requestAICopy(input: {
  storeName: string;
  cuisineType: string;
  signatureDishes: string[];
  environmentStyle: string;
  platform: CopyPlatform;
  style: CopyStyle;
  userFeeling: string;
}) {
  const response = await fetch("/api/ai/copy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await response.json().catch(() => ({}))) as AICopyResult | CopyApiError;

  if (!response.ok) {
    throw new Error(("error" in data && data.error) || "生成失败，请稍后重试");
  }

  return data as AICopyResult;
}

export default function AICopyPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  usePageView("ai_copy", campaignId);

  const [previews, setPreviews] = useState<string[]>([]);
  const [platform, setPlatform] = useState<CopyPlatform>("xiaohongshu");
  const [style, setStyle] = useState<CopyStyle>("foodie_review");
  const [storeName, setStoreName] = useState("");
  const [cuisineType, setCuisineType] = useState("火锅");
  const [signatureDishes, setSignatureDishes] = useState("招牌口水鸡、秘制红烧肉、红糖糍粑");
  const [environmentStyle, setEnvironmentStyle] = useState("热闹、有烟火气，适合朋友聚餐");
  const [userFeeling, setUserFeeling] = useState("");
  const [currentCopy, setCurrentCopy] = useState<GeneratedCopy | null>(null);
  const [copiedPlatform, setCopiedPlatform] = useState<CopyPlatform | null>(null);
  const generatedCopies = useH5CampaignStore((state) => state.generatedCopies);
  const addGeneratedCopies = useH5CampaignStore((state) => state.addGeneratedCopies);

  const { data: campaign } = useQuery({
    queryKey: ["h5-campaign", campaignId],
    queryFn: () => fetchH5Campaign(campaignId),
  });

  useEffect(() => {
    if (campaign?.merchant.name && !storeName) {
      setStoreName(campaign.merchant.name);
    }
  }, [campaign?.merchant.name, storeName]);

  const dishes = useMemo(() => splitSignatureDishes(signatureDishes), [signatureDishes]);
  const selectedPlatform = platformOptions.find((item) => item.value === platform) ?? platformOptions[0];
  const currentPlatform = currentCopy
    ? platformOptions.find((item) => item.value === currentCopy.platform) ?? platformOptions[0]
    : selectedPlatform;
  const canGenerate =
    storeName.trim() && cuisineType.trim() && dishes.length > 0 && environmentStyle.trim() && userFeeling.trim();

  const aiCopyMutation = useMutation({
    mutationFn: requestAICopy,
    onSuccess: (result) => {
      const now = new Date().toISOString();
      const nextCopy: GeneratedCopy = {
        id: `${result.platform}-${Date.now()}`,
        platform: result.platform,
        title: result.title,
        content: result.content,
        tags: result.tags,
        createdAt: now,
      };
      setCurrentCopy(nextCopy);
      setCopiedPlatform(null);
      addGeneratedCopies([nextCopy]);
      toast({ title: "文案已生成", description: `${platformLabel[result.platform]}版本已保存到历史记录。` });
    },
    onError: (error) => {
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "请稍后重试。",
      });
    },
  });

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    previews.forEach((preview) => URL.revokeObjectURL(preview));
    const nextFiles = Array.from(files).slice(0, 2);
    setPreviews(nextFiles.map((file) => URL.createObjectURL(file)));
    if (Array.from(files).length > 2) {
      toast({ title: "最多上传 2 张", description: "已自动保留前 2 张图片。" });
    }
  };

  const generateCopy = () => {
    if (!canGenerate) {
      toast({ title: "信息不完整", description: "请补充门店名、菜系、招牌菜、环境风格和真实感受。" });
      return;
    }
    aiCopyMutation.mutate({
      storeName: storeName.trim(),
      cuisineType: cuisineType.trim(),
      signatureDishes: dishes,
      environmentStyle: environmentStyle.trim(),
      platform,
      style,
      userFeeling: userFeeling.trim(),
    });
  };

  const copyText = async (copy: GeneratedCopy) => {
    try {
      await navigator.clipboard.writeText(formatCopyForClipboard(copy));
      setCopiedPlatform(copy.platform);
      toast({ title: "已复制文案", description: `${platformLabel[copy.platform]}版本已复制。` });
    } catch {
      toast({ title: "复制失败", description: "当前浏览器未开放剪贴板权限。" });
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-orange-100 bg-[#FFF7F2] p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-[#FF5A2C] p-2 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#1F2937]">AI 文案助手</h2>
            <p className="mt-1 text-sm text-slate-600">选择平台和风格，生成可直接复制发布的探店文案。</p>
          </div>
        </div>
      </section>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-950">门店图片</h3>
            <Badge variant="secondary">{previews.length}/2</Badge>
          </div>

          <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-orange-200 bg-orange-50/50 px-4 py-5 text-center">
            <ImagePlus className="h-8 w-8 text-[#FF5A2C]" />
            <span className="mt-2 text-sm font-medium text-slate-800">选择图片</span>
            <span className="mt-1 text-xs text-slate-500">图片仅本地预览，不上传服务器</span>
            <Input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => handleFiles(event.target.files)}
            />
          </label>

          {previews.length ? (
            <div className="grid grid-cols-2 gap-2">
              {previews.map((preview) => (
                <div
                  key={preview}
                  aria-label="上传图片预览"
                  className="h-28 rounded-md bg-cover bg-center"
                  style={{ backgroundImage: `url(${preview})` }}
                />
              ))}
            </div>
          ) : null}

          <div className="grid gap-3">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">门店名</span>
              <Input value={storeName} onChange={(event) => setStoreName(event.target.value)} placeholder="例如：蜀巷火锅国贸店" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-slate-700">菜系</span>
                <Input value={cuisineType} onChange={(event) => setCuisineType(event.target.value)} placeholder="火锅" />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-slate-700">环境风格</span>
                <Input
                  value={environmentStyle}
                  onChange={(event) => setEnvironmentStyle(event.target.value)}
                  placeholder="热闹、有烟火气"
                />
              </label>
            </div>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">招牌菜</span>
              <Input
                value={signatureDishes}
                onChange={(event) => setSignatureDishes(event.target.value)}
                placeholder="用逗号分隔，例如：口水鸡、红烧肉"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">你的真实感受</span>
              <textarea
                value={userFeeling}
                onChange={(event) => setUserFeeling(event.target.value)}
                className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-6 outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="例如：朋友聚餐氛围很好，锅底香，服务响应快。"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div>
            <h3 className="font-semibold text-slate-950">发布平台</h3>
            <p className="mt-1 text-xs text-slate-500">不同平台会使用不同标题、正文结构和标签规则。</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {platformOptions.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setPlatform(item.value)}
                className={`rounded-lg border p-3 text-left transition ${
                  platform === item.value
                    ? "border-[#FF5A2C] bg-orange-50 text-[#1F2937]"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className="mt-1 block text-xs leading-5">{item.hint}</span>
              </button>
            ))}
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-slate-950">文案风格</h3>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="文案风格">
              {styleOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={style === item.value}
                  onClick={() => setStyle(item.value)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    style === item.value
                      ? "border-[#FF5A2C] bg-[#FF5A2C] text-white"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            className="h-11 w-full bg-[#FF5A2C] text-base text-white hover:bg-[#e94f25]"
            disabled={aiCopyMutation.isPending}
            onClick={generateCopy}
          >
            {aiCopyMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在生成
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                生成{selectedPlatform.label}文案
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {currentCopy ? (
        <section className="space-y-3">
          <Card className="border-orange-100">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-950">{currentCopy.title}</h3>
                  <p className="text-xs text-slate-500">{platformLabel[currentCopy.platform]}</p>
                </div>
                <Badge variant="outline">{platformLabel[currentCopy.platform]}</Badge>
              </div>
              <p className="whitespace-pre-line rounded-md bg-[#FAFAF8] p-3 text-sm leading-6 text-slate-700">
                {currentCopy.content}
              </p>
              {currentCopy.tags.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {currentCopy.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      #{tag.replace(/^#/, "")}
                    </Badge>
                  ))}
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-10" onClick={() => copyText(currentCopy)}>
                  <Copy className="mr-2 h-4 w-4" />
                  复制
                </Button>
                <Button asChild className="h-10 bg-[#FF5A2C] text-white hover:bg-[#e94f25]">
                  <a href={currentPlatform.launchUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    去发布
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {copiedPlatform ? (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                已复制，可前往{platformLabel[copiedPlatform]}发布
              </div>
              <a
                href={(platformOptions.find((item) => item.value === copiedPlatform) ?? platformOptions[0]).launchUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs underline underline-offset-4"
              >
                打开平台
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ) : null}

          <Button asChild variant="secondary" className="h-11 w-full">
            <Link href={`/h5/campaign/${campaignId}/submit?taskId=l3-post`}>
              <Upload className="mr-2 h-4 w-4" />
              发布后上传凭证
            </Link>
          </Button>
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-950">生成历史</h3>
        {generatedCopies.length ? (
          generatedCopies.slice(0, 6).map((copy) => (
            <Card key={copy.id}>
              <CardContent className="p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge variant="secondary">{platformLabel[copy.platform]}</Badge>
                  <span className="shrink-0 text-xs text-slate-400">
                    {new Date(copy.createdAt).toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="line-clamp-3 text-sm leading-6 text-slate-600">{copy.content}</p>
                {copy.tags.length ? (
                  <p className="mt-2 line-clamp-1 text-xs text-slate-400">
                    {copy.tags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ")}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-center text-sm text-slate-500">
            生成后会在这里保存最近记录。
          </div>
        )}
      </section>
    </div>
  );
}
