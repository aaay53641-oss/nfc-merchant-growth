"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Copy, ExternalLink, ImagePlus, RotateCcw, Sparkles, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { buildMockCopies, platformLinks } from "@/lib/h5/mock";
import type { GeneratedCopy } from "@/lib/h5/types";
import { useH5CampaignStore } from "@/store/h5-campaign-store";

const platformLabel: Record<GeneratedCopy["platform"], string> = {
  xiaohongshu: "小红书",
  douyin: "抖音",
  dianping: "大众点评",
};

export default function AICopyPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const [previews, setPreviews] = useState<string[]>([]);
  const [copies, setCopies] = useState<GeneratedCopy[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const generatedCopies = useH5CampaignStore((state) => state.generatedCopies);
  const addGeneratedCopies = useH5CampaignStore((state) => state.addGeneratedCopies);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const nextFiles = Array.from(files).slice(0, 2);
    const nextPreviews = nextFiles.map((file) => URL.createObjectURL(file));
    setPreviews(nextPreviews);
    if (Array.from(files).length > 2) {
      toast({ title: "最多上传 2 张", description: "已自动保留前 2 张图片。" });
    }
  };

  const generateCopies = () => {
    setIsGenerating(true);
    window.setTimeout(() => {
      const now = new Date().toISOString();
      const next = buildMockCopies().map((copy, index) => ({
        ...copy,
        id: `${copy.platform}-${Date.now()}-${index}`,
        createdAt: now,
      }));
      setCopies(next);
      addGeneratedCopies(next);
      setIsGenerating(false);
      toast({ title: "文案已生成", description: "已生成小红书、抖音、大众点评 3 个版本。" });
    }, 700);
  };

  const copyText = async (copy: GeneratedCopy) => {
    await navigator.clipboard.writeText(copy.content);
    toast({ title: "已复制文案", description: `${platformLabel[copy.platform]}版本已复制。` });
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-slate-950 p-2 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-950">AI 文案助手</h2>
            <p className="mt-1 text-sm text-slate-500">上传 1-2 张图，生成三平台种草文案。</p>
          </div>
        </div>
      </section>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-950">门店图片</h3>
            <Badge variant="secondary">{previews.length}/2</Badge>
          </div>

          <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
            <ImagePlus className="h-8 w-8 text-slate-400" />
            <span className="mt-2 text-sm font-medium text-slate-700">选择图片</span>
            <span className="mt-1 text-xs text-slate-500">支持 1-2 张，生成本地预览</span>
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
                <img
                  key={preview}
                  src={preview}
                  alt="上传图片预览"
                  className="h-28 w-full rounded-md object-cover"
                />
              ))}
            </div>
          ) : null}

          <Button className="h-11 w-full" disabled={!previews.length || isGenerating} onClick={generateCopies}>
            {isGenerating ? (
              <>
                <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                生成中
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                生成 3 个平台文案
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {copies.length ? (
        <section className="space-y-3">
          {copies.map((copy) => (
            <Card key={copy.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-950">{copy.title}</h3>
                    <p className="text-xs text-slate-500">{platformLabel[copy.platform]}</p>
                  </div>
                  <Badge variant="outline">{platformLabel[copy.platform]}</Badge>
                </div>
                <p className="whitespace-pre-line rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                  {copy.content}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-10" onClick={() => copyText(copy)}>
                    <Copy className="mr-2 h-4 w-4" />
                    复制
                  </Button>
                  <Button asChild className="h-10">
                    <a href={platformLinks[copy.platform]} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      去发布
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

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
                <div className="mb-2 flex items-center justify-between">
                  <Badge variant="secondary">{platformLabel[copy.platform]}</Badge>
                  <span className="text-xs text-slate-400">
                    {new Date(copy.createdAt).toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="line-clamp-3 text-sm leading-6 text-slate-600">{copy.content}</p>
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
