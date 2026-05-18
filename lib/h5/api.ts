import type { H5Campaign, H5Reward, H5Task } from "@/lib/h5/types";
import {
  buildMockCopies,
  fetchH5Campaign as mockCampaign,
  fetchH5Rewards as mockRewards,
  fetchH5Tasks as mockTasks,
  mockAllianceCoupons,
} from "@/lib/h5/mock";

// Demo openid for H5 flow (no login system in Sprint 2)
const DEMO_OPENID = "demo-user-001";

// Stored participation ID (created once per campaign)
let participationCache: Record<string, { participationId: string; campaignId: string }> = {};

// ─── Helpers ────────────────────────────────────────

async function safeApiCall<T>(endpoint: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false }> {
  try {
    const res = await fetch(endpoint, { cache: "no-store", ...init });
    if (!res.ok) {
      console.warn(`[h5-api] ${endpoint} → ${res.status} ${res.statusText}`);
      return { ok: false };
    }
    return { ok: true, data: await res.json() };
  } catch (error) {
    console.warn(`[h5-api] ${endpoint} fetch failed`, error);
    return { ok: false };
  }
}

// ─── Campaign ────────────────────────────────────────

export async function fetchH5Campaign(campaignId: string): Promise<H5Campaign> {
  const result = await safeApiCall<{
    id: string;
    title: string;
    description: string | null;
    startDate: string;
    endDate: string;
    merchant: { name: string; logo: string | null; address: string | null; phone: string | null; verified?: boolean };
    store: { name: string; address: string | null; phone: string | null };
  }>(`/api/campaigns/${campaignId}`);

  if (result.ok) {
    const c = result.data;
    return {
      id: c.id,
      title: c.title,
      subtitle: c.description ?? "",
      guide: "到店必玩 · 闯关寻宝 · 好礼带回家",
      startDate: formatDate(c.startDate),
      endDate: formatDate(c.endDate),
      merchant: {
        name: c.store?.name ?? c.merchant.name,
        logo: c.merchant.logo ?? "🔥",
        address: c.merchant.address ?? "",
        businessHours: "11:00 - 23:30",
        phone: c.merchant.phone ?? "",
        verified: c.merchant.verified ?? false,
      },
    };
  }

  return mockCampaign(campaignId);
}

// ─── Tasks ───────────────────────────────────────────

export async function fetchH5Tasks(campaignId?: string): Promise<H5Task[]> {
  if (!campaignId) return mockTasks();

  const result = await safeApiCall<{
    tasks: Array<{
      id: string;
      sortOrder: number;
      taskType: string;
      title: string;
      description: string | null;
      completionRule: string | null;
      reward: { name: string; description: string | null } | null;
    }>;
  }>(`/api/campaigns/${campaignId}/tasks`);

  if (result.ok) {
    return result.data.tasks.map((t) => ({
      id: taskSortOrderToId(t.sortOrder),
      apiTaskId: t.id,
      level: t.sortOrder,
      kind: taskTypeToKind(t.taskType),
      title: getTaskTitle(t.sortOrder, t.title),
      shortTitle: t.title,
      description: t.description ?? "",
      reward: t.reward?.name ?? "",
      guide: t.completionRule ?? "",
      estimatedTime: t.sortOrder === 1 ? "约 10 秒" : t.sortOrder === 2 ? "约 30 秒" : "约 2 分钟",
      steps: getTaskSteps(t.sortOrder),
    }));
  }

  return mockTasks();
}

// ─── Rewards ─────────────────────────────────────────

export async function fetchH5Rewards(
  participationId?: string,
  campaignId?: string
): Promise<H5Reward[]> {
  if (!participationId && !campaignId) return mockRewards();

  const query = participationId
    ? `participationId=${encodeURIComponent(participationId)}`
    : `campaignId=${encodeURIComponent(campaignId!)}`;

  const result = await safeApiCall<{
    allTasksApproved: boolean;
    rewards: Array<{
      id: string;
      taskId: H5Reward["taskId"] | null;
      name: string;
      description: string | null;
      type: string;
      totalStock: number;
      remainingStock: number;
      claimedCount: number;
      isSoldOut: boolean;
      validUntil: string | null;
      redemption: H5Reward["redemption"];
    }>;
  }>(`/api/rewards/available?${query}`);

  if (result.ok) {
    return result.data.rewards.map((r, index) => ({
      id: `r${index + 1}` as H5Reward["id"],
      apiRewardId: r.id,
      taskId: r.taskId ?? (`l${index + 1}` as H5Task["id"]),
      name: r.name,
      description: r.description ?? "",
      validUntil: r.validUntil ? formatDate(r.validUntil) : "当天营业结束前",
      useStores: "蜀巷火锅国贸店",
      totalStock: r.totalStock,
      remainingStock: r.remainingStock,
      claimedCount: r.claimedCount,
      isSoldOut: r.isSoldOut,
      redemption: r.redemption,
    }));
  }

  return mockRewards();
}

// ─── Alliance Coupons ────────────────────────────────

export interface AllianceCouponDto {
  id: string;
  name: string;
  description: string | null;
  discount: number;
  partnerName: string;
}

export async function fetchH5AllianceCoupons(): Promise<AllianceCouponDto[]> {
  const result = await safeApiCall<{ coupons: AllianceCouponDto[] }>("/api/alliance-coupons");
  if (result.ok) return result.data.coupons;
  return mockAllianceCoupons.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    discount: c.id === "a1" ? 20 : 50,
    partnerName: c.merchantName,
  }));
}

// ─── Submissions ─────────────────────────────────────

export interface SubmissionInput {
  participationId: string;
  taskId: string;
  content?: string;
  imageUrls?: string[];
  platformLink?: string;
}

export async function createH5Submission(input: SubmissionInput) {
  const result = await safeApiCall<{
    submission: { id: string; status: string; submittedAt: string };
  }>("/api/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (result.ok) return result.data;
  // Fallback: return mock submission
  return {
    submission: {
      id: `sub-${Date.now()}`,
      status: "SUBMITTED",
      submittedAt: new Date().toISOString(),
    },
  };
}

// ─── Redemptions ─────────────────────────────────────

export async function createH5Redemption(rewardId: string, participationId: string) {
  const response = await fetch("/api/redemptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rewardId, participationId }),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error ?? "领取失败，请稍后重试");
  }

  return data as {
    redemption: { id: string; code: string; status: string };
  };
}

// ─── Participations ──────────────────────────────────

export async function getOrCreateParticipation(campaignId: string) {
  if (participationCache[campaignId]) {
    return participationCache[campaignId];
  }

  const result = await safeApiCall<{ participation: { id: string; campaignId: string }; message?: string }>(
    "/api/participations",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openid: DEMO_OPENID, campaignId }),
    }
  );

  if (result.ok) {
    participationCache[campaignId] = {
      participationId: result.data.participation.id,
      campaignId: result.data.participation.campaignId,
    };
  } else {
    // Fallback: use a local ID
    participationCache[campaignId] = {
      participationId: `participation-${campaignId}`,
      campaignId,
    };
  }

  return participationCache[campaignId];
}

// ─── AI Copy ─────────────────────────────────────────

export async function fetchH5GeneratedCopies() {
  // AI generation endpoint is not yet available in Sprint 2
  return buildMockCopies().map((copy, index) => ({
    ...copy,
    id: `copy-${index}`,
    createdAt: new Date().toISOString(),
  }));
}

// ─── Helpers ─────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function taskSortOrderToId(order: number): H5Task["id"] {
  if (order === 1) return "l1";
  if (order === 2) return "l2";
  return "l3";
}

function taskTypeToKind(type: string): H5Task["kind"] {
  if (type === "NFC_SCAN" || type === "ADD_WECHAT") return "NFC_WECHAT";
  if (type === "PHOTO_CHECKIN" || type === "DIANPING_REVIEW") return "PHOTO_REVIEW";
  return "CONTENT_POST";
}

function getTaskTitle(order: number, title: string): string {
  if (title.includes("第")) return title;
  const prefixes = ["", "第一关 · ", "第二关 · ", "第三关 · "];
  return `${prefixes[order]}${title}`;
}

function getTaskSteps(order: number): string[] {
  if (order === 1) return ["碰一碰桌上 NFC 贴纸", "添加门店企业微信", "等待系统发放进门礼"];
  if (order === 2) return ["到网红打卡墙拍照", "跳转大众点评完成打卡", "上传截图等待审核"];
  return ["选择抖音或小红书", "生成并复制种草文案", "发布后提交链接"];
}
