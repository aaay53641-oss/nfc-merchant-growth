"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";

type RewardType =
  | "FREE_DRINK"
  | "FREE_SIDE"
  | "SIGNATURE_DISH"
  | "DESSERT"
  | "LUCKY_DRAW"
  | "VOUCHER"
  | "ALLIANCE_COUPON"
  | "FREE_MEAL";

type RewardDto = {
  id: string;
  campaignId: string;
  campaignTitle: string;
  storeName: string;
  type: RewardType;
  name: string;
  description: string | null;
  quantity: number;
  issuedCount: number;
  remainingQuantity: number;
  validFrom: string | null;
  validUntil: string | null;
  linkedTasksCount: number;
};

type CampaignDto = {
  id: string;
  title: string;
  storeName: string;
};

type RewardsResponse = {
  rewards: RewardDto[];
};

type CampaignsResponse = {
  campaigns: CampaignDto[];
};

type RewardForm = {
  campaignId: string;
  type: RewardType;
  name: string;
  description: string;
  quantity: string;
  validFrom: string;
  validUntil: string;
};

const rewardTypeOptions: Array<{ value: RewardType; label: string }> = [
  { value: "FREE_DRINK", label: "免费饮品" },
  { value: "FREE_SIDE", label: "免费小菜" },
  { value: "SIGNATURE_DISH", label: "招牌荤菜" },
  { value: "DESSERT", label: "甜品" },
  { value: "LUCKY_DRAW", label: "抽奖资格" },
  { value: "VOUCHER", label: "代金券" },
  { value: "ALLIANCE_COUPON", label: "异业券" },
  { value: "FREE_MEAL", label: "霸王餐" },
];

const rewardTypeLabels = Object.fromEntries(
  rewardTypeOptions.map((option) => [option.value, option.label])
) as Record<RewardType, string>;

const emptyForm: RewardForm = {
  campaignId: "",
  type: "FREE_DRINK",
  name: "",
  description: "",
  quantity: "0",
  validFrom: "",
  validUntil: "",
};

function toDatetimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function toForm(reward: RewardDto | null, fallbackCampaignId = ""): RewardForm {
  if (!reward) {
    return {
      ...emptyForm,
      campaignId: fallbackCampaignId,
    };
  }

  return {
    campaignId: reward.campaignId,
    type: reward.type,
    name: reward.name,
    description: reward.description ?? "",
    quantity: String(reward.quantity),
    validFrom: toDatetimeLocal(reward.validFrom),
    validUntil: toDatetimeLocal(reward.validUntil),
  };
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error ?? "请求失败");
  }

  return data as T;
}

export default function RewardsPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardDto | null>(null);
  const [deletingReward, setDeletingReward] = useState<RewardDto | null>(null);
  const [form, setForm] = useState<RewardForm>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ["merchant-rewards"],
    queryFn: () => requestJson<RewardsResponse>("/api/merchant/rewards"),
  });
  const rewards = data?.rewards ?? [];

  const { data: campaignsData } = useQuery({
    queryKey: ["merchant-campaigns"],
    queryFn: () => requestJson<CampaignsResponse>("/api/merchant/campaigns"),
  });
  const campaigns = campaignsData?.campaigns ?? [];
  const fallbackCampaignId = campaigns[0]?.id ?? "";

  const saveReward = useMutation({
    mutationFn: async () => {
      const payload = {
        campaignId: form.campaignId || fallbackCampaignId,
        type: form.type,
        name: form.name,
        description: form.description,
        quantity: Number(form.quantity || 0),
        validFrom: form.validFrom,
        validUntil: form.validUntil,
      };

      if (editingReward) {
        return requestJson<{ reward: RewardDto }>(
          `/api/merchant/rewards/${editingReward.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );
      }

      return requestJson<{ reward: RewardDto }>("/api/merchant/rewards", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-rewards"] });
      queryClient.invalidateQueries({ queryKey: ["merchant-campaigns"] });
      setFormOpen(false);
      setEditingReward(null);
      toast({ title: "奖励已保存" });
    },
    onError: (error) => {
      toast({ title: "保存失败", description: error.message });
    },
  });

  const deleteReward = useMutation({
    mutationFn: async (rewardId: string) =>
      requestJson<{ ok: true }>(`/api/merchant/rewards/${rewardId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-rewards"] });
      setDeletingReward(null);
      toast({ title: "奖励已删除" });
    },
    onError: (error) => {
      toast({ title: "删除失败", description: error.message });
    },
  });

  function openCreateDialog() {
    setEditingReward(null);
    setForm(toForm(null, fallbackCampaignId));
    setFormOpen(true);
  }

  function openEditDialog(reward: RewardDto) {
    setEditingReward(reward);
    setForm(toForm(reward));
    setFormOpen(true);
  }

  function updateForm(key: keyof RewardForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">奖励配置</h1>
          <p className="text-sm text-slate-500">维护活动奖励、库存和有效期。</p>
        </div>
        <Button type="button" disabled={!fallbackCampaignId} onClick={openCreateDialog}>
          <Plus className="size-4" />
          新增奖励
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">奖励列表</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-slate-500">加载中...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="px-4 py-3 font-medium">奖励名称</th>
                    <th className="px-4 py-3 font-medium">类型</th>
                    <th className="px-4 py-3 font-medium">活动</th>
                    <th className="px-4 py-3 font-medium">剩余数量</th>
                    <th className="px-4 py-3 font-medium">有效期</th>
                    <th className="px-4 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rewards.map((reward) => (
                    <tr key={reward.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">{reward.name}</div>
                        <div className="line-clamp-1 max-w-xs text-xs text-slate-500">
                          {reward.description || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{rewardTypeLabels[reward.type]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div>{reward.campaignTitle}</div>
                        <div className="text-xs text-slate-500">{reward.storeName}</div>
                      </td>
                      <td className="px-4 py-3">
                        {reward.remainingQuantity} / {reward.quantity}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(reward.validFrom)} - {formatDate(reward.validUntil)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(reward)}
                          >
                            <Edit2 className="size-4" />
                            编辑
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeletingReward(reward)}
                          >
                            <Trash2 className="size-4" />
                            删除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingReward ? "编辑奖励" : "新增奖励"}</DialogTitle>
            <DialogDescription>奖励必须关联到具体活动。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reward-campaign">关联活动</Label>
              <select
                id="reward-campaign"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.campaignId || fallbackCampaignId}
                onChange={(event) => updateForm("campaignId", event.target.value)}
              >
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.title} · {campaign.storeName}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reward-type">类型</Label>
                <select
                  id="reward-type"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.type}
                  onChange={(event) => updateForm("type", event.target.value)}
                >
                  {rewardTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reward-name">名称</Label>
                <Input
                  id="reward-name"
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="reward-description">描述</Label>
                <textarea
                  id="reward-description"
                  className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.description}
                  onChange={(event) => updateForm("description", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reward-quantity">数量</Label>
                <Input
                  id="reward-quantity"
                  type="number"
                  min={0}
                  value={form.quantity}
                  onChange={(event) => updateForm("quantity", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reward-valid-from">有效开始</Label>
                <Input
                  id="reward-valid-from"
                  type="datetime-local"
                  value={form.validFrom}
                  onChange={(event) => updateForm("validFrom", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reward-valid-until">有效结束</Label>
                <Input
                  id="reward-valid-until"
                  type="datetime-local"
                  value={form.validUntil}
                  onChange={(event) => updateForm("validUntil", event.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                取消
              </Button>
              <Button
                type="button"
                disabled={
                  !form.name.trim() ||
                  !(form.campaignId || fallbackCampaignId) ||
                  saveReward.isPending
                }
                onClick={() => saveReward.mutate()}
              >
                保存奖励
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingReward)} onOpenChange={() => setDeletingReward(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除奖励</DialogTitle>
            <DialogDescription>
              已关联任务、领取记录或核销记录的奖励会被 API 拒绝删除。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeletingReward(null)}>
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!deletingReward || deleteReward.isPending}
              onClick={() => deletingReward && deleteReward.mutate(deletingReward.id)}
            >
              确认删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
