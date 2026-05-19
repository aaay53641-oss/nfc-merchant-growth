"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Pencil, Plus, Trash2, Video } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";

type MediaType = "IMAGE" | "VIDEO";

type CampaignMedia = {
  id: string;
  url: string;
  mediaType: MediaType;
  category: string | null;
  platform: string | null;
  dishName: string | null;
  title: string | null;
  tags: string[];
  description: string | null;
  allowUserUse: boolean;
  enabled: boolean;
  sortOrder: number;
  step2Enabled: boolean;
  step3Enabled: boolean;
};

type FormState = {
  id?: string;
  url: string;
  mediaType: MediaType;
  category: string;
  platform: string;
  dishName: string;
  title: string;
  tags: string;
  description: string;
  allowUserUse: boolean;
  enabled: boolean;
  sortOrder: number;
};

const initialForm = (step: 2 | 3): FormState => ({
  url: "",
  mediaType: "IMAGE",
  category: "",
  platform: "",
  dishName: "",
  title: "",
  tags: "",
  description: "",
  allowUserUse: true,
  enabled: true,
  sortOrder: step === 2 ? 20 : 30,
});

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.error ?? "请求失败");
  }
  return body.data as T;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function CampaignMediaManager({ campaignId, step }: { campaignId: string; step: 2 | 3 }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(initialForm(step));
  const [showForm, setShowForm] = useState(false);
  const endpoint = `/api/merchant/campaigns/${campaignId}/media`;

  const { data, isLoading } = useQuery({
    queryKey: ["merchant-campaign-media", campaignId, step],
    queryFn: () => apiRequest<{ media: CampaignMedia[] }>(`${endpoint}?step=${step}`),
  });
  const media = data?.media ?? [];

  const title = useMemo(() => (step === 2 ? "第二关点评图片素材库" : "第三关内容素材库"), [step]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        tags: form.tags.split(/[、,，\n]/).map((item) => item.trim()).filter(Boolean),
        step2Enabled: step === 2,
        step3Enabled: step === 3,
      };
      return apiRequest<{ media: CampaignMedia }>(endpoint, {
        method: form.id ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-campaign-media", campaignId, step] });
      setForm(initialForm(step));
      setShowForm(false);
      toast({ title: "素材已保存" });
    },
    onError: (error) => {
      toast({ title: "保存失败", description: error instanceof Error ? error.message : "请稍后重试" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest<{ id: string }>(`${endpoint}?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-campaign-media", campaignId, step] });
      toast({ title: "素材已删除" });
    },
    onError: (error) => {
      toast({ title: "删除失败", description: error instanceof Error ? error.message : "请稍后重试" });
    },
  });

  const startEdit = (item: CampaignMedia) => {
    setForm({
      id: item.id,
      url: item.url,
      mediaType: item.mediaType,
      category: item.category ?? "",
      platform: item.platform ?? "",
      dishName: item.dishName ?? "",
      title: item.title ?? "",
      tags: item.tags.join("、"),
      description: item.description ?? "",
      allowUserUse: item.allowUserUse,
      enabled: item.enabled,
      sortOrder: item.sortOrder,
    });
    setShowForm(true);
  };

  const handleUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const url = await fileToDataUrl(file);
    setForm((current) => ({
      ...current,
      mediaType: file.type.startsWith("video/") ? "VIDEO" : "IMAGE",
      url,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            上传或粘贴素材 URL，H5 会按步骤、平台和启用状态读取。
          </p>
        </div>
        <Button type="button" onClick={() => setShowForm((value) => !value)}>
          <Plus className="size-4" />
          新增素材
        </Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{form.id ? "编辑素材" : "新增素材"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>上传素材或粘贴 URL</Label>
              <div className="flex gap-2">
                <Input value={form.url} onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))} placeholder="https:// 或 data:image/..." />
                <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <ImagePlus className="size-4" />
                  上传
                  <input type="file" accept="image/*,video/*" className="hidden" onChange={(event) => handleUpload(event.target.files)} />
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>素材名称</Label>
              <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>类型</Label>
              <select className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.mediaType} onChange={(event) => setForm((current) => ({ ...current, mediaType: event.target.value as MediaType }))}>
                <option value="IMAGE">图片</option>
                <option value="VIDEO">视频</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>分类</Label>
              <Input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="门头 / 环境 / 菜品 / 活动" />
            </div>
            <div className="space-y-2">
              <Label>适用平台</Label>
              <Input value={form.platform} onChange={(event) => setForm((current) => ({ ...current, platform: event.target.value }))} placeholder="dianping / douyin / meituan" />
            </div>
            <div className="space-y-2">
              <Label>适用菜品</Label>
              <Input value={form.dishName} onChange={(event) => setForm((current) => ({ ...current, dishName: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>推荐标签</Label>
              <Input value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} placeholder="烟火气、朋友聚餐" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>使用说明</Label>
              <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </div>
            <div className="grid gap-2 text-sm text-slate-700 md:col-span-2 md:grid-cols-3">
              <label className="flex items-center gap-2 rounded-lg border p-3">
                <input type="checkbox" checked={form.allowUserUse} onChange={(event) => setForm((current) => ({ ...current, allowUserUse: event.target.checked }))} />
                允许用户使用
              </label>
              <label className="flex items-center gap-2 rounded-lg border p-3">
                <input type="checkbox" checked={form.enabled} onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))} />
                启用
              </label>
              <div className="space-y-1">
                <Label>排序</Label>
                <Input type="number" value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))} />
              </div>
            </div>
            <div className="flex gap-2 md:col-span-2">
              <Button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                {saveMutation.isPending ? "保存中..." : "保存素材"}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setForm(initialForm(step)); setShowForm(false); }}>
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <Card><CardContent className="p-6 text-sm text-slate-500">加载素材中...</CardContent></Card>
        ) : media.length === 0 ? (
          <Card className="border-dashed"><CardContent className="p-6 text-sm text-slate-500">暂无素材，先新增一张图片或视频。</CardContent></Card>
        ) : (
          media.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="aspect-video bg-slate-100">
                {item.mediaType === "VIDEO" ? (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    <Video className="size-8" />
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={item.title ?? "素材"} className="h-full w-full object-cover" />
                )}
              </div>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{item.title || item.category || "未命名素材"}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.platform || "全平台"} · {item.dishName || "通用"}</p>
                  </div>
                  <Badge variant={item.enabled ? "success" : "muted"}>{item.enabled ? "启用" : "停用"}</Badge>
                </div>
                <p className="line-clamp-2 text-sm text-slate-600">{item.description || "暂无说明"}</p>
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => startEdit(item)}>
                    <Pencil className="size-4" />
                    编辑
                  </Button>
                  <Button type="button" variant="destructive" size="sm" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(item.id)}>
                    <Trash2 className="size-4" />
                    删除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
