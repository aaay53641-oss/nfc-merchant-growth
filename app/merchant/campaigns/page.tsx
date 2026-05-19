"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Plus, RotateCcw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

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

type StoreDto = {
  id: string;
  name: string;
};

type StoresResponse = {
  stores: StoreDto[];
};

type CampaignDto = {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  storeId: string;
  storeName: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  participants: number;
  tasks: CampaignTaskDto[];
};

type CampaignTaskDto = {
  id: string;
  taskType: TaskType;
  title: string;
  description: string | null;
  completionRule: string | null;
  verifyType: VerifyType;
  reward: RewardConfig | null;
};

type CampaignsResponse = {
  campaigns: CampaignDto[];
};

type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED";
type TaskType =
  | "NFC_SCAN"
  | "ADD_WECHAT"
  | "PHOTO_CHECKIN"
  | "DIANPING_REVIEW"
  | "DOUYIN_POST"
  | "XIAOHONGSHU_POST"
  | "WECHAT_MOMENTS"
  | "SCREENSHOT_UPLOAD"
  | "AI_COPY";
type VerifyType = "AUTO" | "MANUAL_REVIEW" | "SCREENSHOT" | "LINK";
type RewardType =
  | "FREE_DRINK"
  | "FREE_SIDE"
  | "SIGNATURE_DISH"
  | "DESSERT"
  | "LUCKY_DRAW"
  | "VOUCHER"
  | "ALLIANCE_COUPON"
  | "FREE_MEAL";

type RewardConfig = {
  type: RewardType;
  name: string;
  description: string | null;
  quantity: number;
  validFrom: string | null;
  validUntil: string | null;
};

type TaskForm = {
  taskType: TaskType;
  title: string;
  description: string;
  completionRule: string;
  verifyType: VerifyType;
  reward: {
    type: RewardType;
    name: string;
    description: string;
    quantity: string;
    validFrom: string;
    validUntil: string;
  };
};

type CampaignForm = {
  title: string;
  description: string;
  coverImage: string;
  storeId: string;
  startDate: string;
  endDate: string;
  status: CampaignStatus;
  tasks: TaskForm[];
};

const taskTypeOptions: Array<{ value: TaskType; label: string }> = [
  { value: "NFC_SCAN", label: "NFC触发" },
  { value: "ADD_WECHAT", label: "添加微信" },
  { value: "PHOTO_CHECKIN", label: "拍照打卡" },
  { value: "DIANPING_REVIEW", label: "大众点评" },
  { value: "DOUYIN_POST", label: "抖音发布" },
  { value: "XIAOHONGSHU_POST", label: "小红书发布" },
  { value: "WECHAT_MOMENTS", label: "朋友圈" },
  { value: "SCREENSHOT_UPLOAD", label: "截图上传" },
  { value: "AI_COPY", label: "AI文案" },
];

const verifyTypeOptions: Array<{ value: VerifyType; label: string }> = [
  { value: "AUTO", label: "自动通过" },
  { value: "MANUAL_REVIEW", label: "人工审核" },
  { value: "SCREENSHOT", label: "截图校验" },
  { value: "LINK", label: "链接校验" },
];

const statusOptions: Array<{ value: CampaignStatus; label: string }> = [
  { value: "DRAFT", label: "草稿" },
  { value: "ACTIVE", label: "上线" },
  { value: "PAUSED", label: "下线" },
];

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

const defaultTasks: TaskForm[] = [
  {
    taskType: "NFC_SCAN",
    title: "第一关 · 进门有礼",
    description: "触碰桌上 NFC 贴纸，添加企业微信，开启寻宝之旅。",
    completionRule: "碰一碰桌上 NFC 贴纸，再按页面提示添加企业微信",
    verifyType: "AUTO",
    reward: {
      type: "FREE_DRINK",
      name: "免费指定饮品",
      description: "指定饮品任选一杯",
      quantity: "100",
      validFrom: "",
      validUntil: "",
    },
  },
  {
    taskType: "PHOTO_CHECKIN",
    title: "第二关 · 打卡有礼",
    description: "拍照打卡并完成大众点评真实评价。",
    completionRule: "上传打卡照片或点评截图，审核通过后领取奖励",
    verifyType: "MANUAL_REVIEW",
    reward: {
      type: "SIGNATURE_DISH",
      name: "招牌荤菜兑换券",
      description: "招牌菜任选一份",
      quantity: "50",
      validFrom: "",
      validUntil: "",
    },
  },
  {
    taskType: "DOUYIN_POST",
    title: "第三关 · 裂变有礼",
    description: "任选平台发布真实种草内容并提交链接。",
    completionRule: "使用 AI 文案助手生成内容，发布后提交链接",
    verifyType: "LINK",
    reward: {
      type: "DESSERT",
      name: "甜品 + 霸王餐抽奖",
      description: "甜品一份并获得抽奖资格",
      quantity: "30",
      validFrom: "",
      validUntil: "",
    },
  },
];

function cloneDefaultTasks() {
  return defaultTasks.map((task) => ({
    ...task,
    reward: { ...task.reward },
  }));
}

function defaultForm(storeId = ""): CampaignForm {
  const now = new Date();
  const later = new Date(now);
  later.setMonth(later.getMonth() + 1);

  return {
    title: "",
    description: "",
    coverImage: "",
    storeId,
    startDate: toDatetimeLocal(now.toISOString()),
    endDate: toDatetimeLocal(later.toISOString()),
    status: "DRAFT",
    tasks: cloneDefaultTasks(),
  };
}

function toDatetimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function statusLabel(status: CampaignStatus) {
  if (status === "ACTIVE") return "上线";
  if (status === "PAUSED") return "下线";
  if (status === "ENDED") return "结束";
  return "草稿";
}

function statusVariant(status: CampaignStatus) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "PAUSED") return "warning" as const;
  return "muted" as const;
}

function campaignToForm(campaign: CampaignDto): CampaignForm {
  const tasks = cloneDefaultTasks();

  campaign.tasks.slice(0, 3).forEach((task, index) => {
    tasks[index] = {
      taskType: task.taskType,
      title: task.title,
      description: task.description ?? "",
      completionRule: task.completionRule ?? "",
      verifyType: task.verifyType,
      reward: {
        type: task.reward?.type ?? tasks[index].reward.type,
        name: task.reward?.name ?? tasks[index].reward.name,
        description: task.reward?.description ?? tasks[index].reward.description,
        quantity: String(task.reward?.quantity ?? tasks[index].reward.quantity),
        validFrom: toDatetimeLocal(task.reward?.validFrom ?? null),
        validUntil: toDatetimeLocal(task.reward?.validUntil ?? null),
      },
    };
  });

  return {
    title: campaign.title,
    description: campaign.description ?? "",
    coverImage: campaign.coverImage ?? "",
    storeId: campaign.storeId,
    startDate: toDatetimeLocal(campaign.startDate),
    endDate: toDatetimeLocal(campaign.endDate),
    status: campaign.status === "ENDED" ? "PAUSED" : campaign.status,
    tasks,
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

function CampaignsContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const storeIdFilter = searchParams.get("storeId");
  const [editingCampaign, setEditingCampaign] = useState<CampaignDto | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CampaignForm>(defaultForm());

  const { data: storeData } = useQuery({
    queryKey: ["merchant-stores"],
    queryFn: () => requestJson<StoresResponse>("/api/stores"),
  });
  const stores = storeData?.stores ?? [];
  const defaultStoreId = stores[0]?.id ?? "";

  const campaignsUrl = storeIdFilter
    ? `/api/merchant/campaigns?storeId=${storeIdFilter}`
    : "/api/merchant/campaigns";
  const { data, isLoading } = useQuery({
    queryKey: ["merchant-campaigns", storeIdFilter],
    queryFn: () => requestJson<CampaignsResponse>(campaignsUrl),
  });
  const campaigns = data?.campaigns ?? [];
  const activeStoreName = stores.find((store) => store.id === storeIdFilter)?.name;

  const saveCampaign = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        storeId: form.storeId || defaultStoreId,
        tasks: form.tasks.map((task) => ({
          taskType: task.taskType,
          title: task.title,
          description: task.description,
          completionRule: task.completionRule,
          verifyType: task.verifyType,
          reward: {
            type: task.reward.type,
            name: task.reward.name,
            description: task.reward.description,
            quantity: Number(task.reward.quantity || 0),
            validFrom: task.reward.validFrom,
            validUntil: task.reward.validUntil,
          },
        })),
      };

      if (editingCampaign) {
        return requestJson<{ campaign: CampaignDto }>(
          `/api/merchant/campaigns/${editingCampaign.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );
      }

      return requestJson<{ campaign: CampaignDto }>("/api/merchant/campaigns", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["merchant-rewards"] });
      setFormOpen(false);
      setEditingCampaign(null);
      toast({ title: "活动已保存" });
    },
    onError: (error) => {
      toast({ title: "保存失败", description: error.message });
    },
  });

  function openCreateDialog() {
    setEditingCampaign(null);
    setForm(defaultForm(storeIdFilter ?? defaultStoreId));
    setFormOpen(true);
  }

  function openEditDialog(campaign: CampaignDto) {
    setEditingCampaign(campaign);
    setForm(campaignToForm(campaign));
    setFormOpen(true);
  }

  function updateTask(index: number, patch: Partial<TaskForm>) {
    setForm((current) => ({
      ...current,
      tasks: current.tasks.map((task, taskIndex) =>
        taskIndex === index ? { ...task, ...patch } : task
      ),
    }));
  }

  function updateTaskReward(
    index: number,
    patch: Partial<TaskForm["reward"]>
  ) {
    setForm((current) => ({
      ...current,
      tasks: current.tasks.map((task, taskIndex) =>
        taskIndex === index ? { ...task, reward: { ...task.reward, ...patch } } : task
      ),
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">活动管理</h1>
          <p className="text-sm text-slate-500">
            创建活动，配置三关任务和对应奖励。
            {activeStoreName ? ` 当前筛选：${activeStoreName}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {storeIdFilter && (
            <Button asChild type="button" variant="outline">
              <a href="/merchant/campaigns">
                <RotateCcw className="size-4" />
                清除筛选
              </a>
            </Button>
          )}
          <Button type="button" onClick={openCreateDialog}>
            <Plus className="size-4" />
            新建活动
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">活动列表</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-slate-500">加载中...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="px-4 py-3 font-medium">活动标题</th>
                    <th className="px-4 py-3 font-medium">门店</th>
                    <th className="px-4 py-3 font-medium">状态</th>
                    <th className="px-4 py-3 font-medium">时间</th>
                    <th className="px-4 py-3 font-medium">参与人数</th>
                    <th className="px-4 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">{campaign.title}</div>
                        <div className="line-clamp-1 max-w-xs text-xs text-slate-500">
                          {campaign.description || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{campaign.storeName}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(campaign.status)}>
                          {statusLabel(campaign.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                      </td>
                      <td className="px-4 py-3">{campaign.participants}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(campaign)}
                          >
                            <Edit2 className="size-4" />
                            编辑
                          </Button>
                          <Button asChild type="button" variant="outline" size="sm">
                            <a href={`/merchant/campaigns/${campaign.id}/media/step2`}>二关素材</a>
                          </Button>
                          <Button asChild type="button" variant="outline" size="sm">
                            <a href={`/merchant/campaigns/${campaign.id}/media/step3`}>三关素材</a>
                          </Button>
                          <Button asChild type="button" variant="outline" size="sm">
                            <a href={`/merchant/campaigns/${campaign.id}/submissions/step2`}>二关确认</a>
                          </Button>
                          <Button asChild type="button" variant="outline" size="sm">
                            <a href={`/merchant/campaigns/${campaign.id}/submissions/step3`}>三关审核</a>
                          </Button>
                          <Button asChild type="button" variant="outline" size="sm">
                            <a href={`/merchant/campaigns/${campaign.id}/lottery/settings`}>抽奖配置</a>
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
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? "编辑活动" : "新建活动"}</DialogTitle>
            <DialogDescription>配置基本信息、三关任务和三关奖励。</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="campaign-title">活动标题</Label>
                <Input
                  id="campaign-title"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-store">关联门店</Label>
                <select
                  id="campaign-store"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.storeId || defaultStoreId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, storeId: event.target.value }))
                  }
                >
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="campaign-description">活动描述</Label>
                <textarea
                  id="campaign-description"
                  className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-cover">封面图 URL</Label>
                <Input
                  id="campaign-cover"
                  value={form.coverImage}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, coverImage: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-status">状态</Label>
                <select
                  id="campaign-status"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as CampaignStatus,
                    }))
                  }
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-start">开始时间</Label>
                <Input
                  id="campaign-start"
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, startDate: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-end">结束时间</Label>
                <Input
                  id="campaign-end"
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, endDate: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">三关任务与奖励</h3>
                <p className="text-xs text-slate-500">每关会创建或更新一个任务和一个奖励。</p>
              </div>
              {form.tasks.map((task, index) => (
                <div key={index} className="rounded-lg border p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="font-medium">第 {index + 1} 关</h4>
                    <Badge variant="outline">L{index + 1}</Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>任务标题</Label>
                      <Input
                        value={task.title}
                        onChange={(event) =>
                          updateTask(index, { title: event.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>任务类型</Label>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={task.taskType}
                        onChange={(event) =>
                          updateTask(index, { taskType: event.target.value as TaskType })
                        }
                      >
                        {taskTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>验证方式</Label>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={task.verifyType}
                        onChange={(event) =>
                          updateTask(index, {
                            verifyType: event.target.value as VerifyType,
                          })
                        }
                      >
                        {verifyTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>奖励类型</Label>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={task.reward.type}
                        onChange={(event) =>
                          updateTaskReward(index, {
                            type: event.target.value as RewardType,
                          })
                        }
                      >
                        {rewardTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>任务描述</Label>
                      <textarea
                        className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={task.description}
                        onChange={(event) =>
                          updateTask(index, { description: event.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>完成规则</Label>
                      <Input
                        value={task.completionRule}
                        onChange={(event) =>
                          updateTask(index, { completionRule: event.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>奖励名称</Label>
                      <Input
                        value={task.reward.name}
                        onChange={(event) =>
                          updateTaskReward(index, { name: event.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>奖励数量</Label>
                      <Input
                        type="number"
                        min={0}
                        value={task.reward.quantity}
                        onChange={(event) =>
                          updateTaskReward(index, { quantity: event.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>奖励描述</Label>
                      <Input
                        value={task.reward.description}
                        onChange={(event) =>
                          updateTaskReward(index, { description: event.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                取消
              </Button>
              <Button
                type="button"
                disabled={!form.title.trim() || !form.storeId || saveCampaign.isPending}
                onClick={() => saveCampaign.mutate()}
              >
                保存活动
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">加载中...</div>}>
      <CampaignsContent />
    </Suspense>
  );
}
