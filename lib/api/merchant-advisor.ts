import { ClaimStatus, EventType, TaskStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type AdvisorSuggestionType =
  | "today"
  | "weekly"
  | "dish"
  | "reward"
  | "script"
  | "dark_horse";

export interface AdvisorSuggestion {
  type: AdvisorSuggestionType;
  title: string;
  content: string;
}

export interface AdvisorMetrics {
  currentParticipants: number;
  previousParticipants: number;
  participantDeltaPercent: number;
  pendingReviews: number;
  rewardsIssued: number;
  rewardsRedeemed: number;
  redemptionRate: number;
  averageTaskCompletionRate: number;
  taskCompletionRates: Array<{
    taskId: string;
    title: string;
    sortOrder: number;
    approvedCount: number;
    participants: number;
    completionRate: number;
  }>;
  platformDistribution: Array<{ platform: string; count: number }>;
}

export interface AdvisorWeeklyReport {
  summary: string;
  taskSummary: string;
  rewardSummary: string;
  recommendation: string;
  mainTaskTitle: string | null;
}

export interface MerchantAdvisorPayload {
  metrics: AdvisorMetrics;
  weeklyReport: AdvisorWeeklyReport;
  suggestions: AdvisorSuggestion[];
  generatedAt: string;
  source: "ai" | "fallback" | "metrics";
}

const suggestionTypes: AdvisorSuggestionType[] = [
  "today",
  "weekly",
  "dish",
  "reward",
  "script",
  "dark_horse",
];

const suggestionTitles: Record<AdvisorSuggestionType, string> = {
  today: "今日建议",
  weekly: "本周总结",
  dish: "主推菜建议",
  reward: "奖励调整建议",
  script: "员工话术建议",
  dark_horse: "本周黑马任务",
};

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function deltaPercent(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function platformLabel(value: string) {
  const labels: Record<string, string> = {
    xiaohongshu: "小红书",
    douyin: "抖音",
    dianping: "大众点评",
    weixin_moments: "朋友圈",
    unknown: "未知平台",
  };
  return labels[value] ?? value;
}

function readMetadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function buildWeeklyReport(metrics: AdvisorMetrics): AdvisorWeeklyReport {
  const bestTask =
    metrics.taskCompletionRates
      .filter((task) => task.approvedCount > 0)
      .sort((a, b) => b.completionRate - a.completionRate || b.approvedCount - a.approvedCount)[0] ?? null;

  const averageRate = metrics.averageTaskCompletionRate;
  const delta = metrics.participantDeltaPercent;
  const deltaText = delta >= 0 ? `+${delta}%` : `${delta}%`;
  const mainTaskTitle = bestTask?.title ?? null;

  return {
    summary: `本周参与 ${metrics.currentParticipants} 人，环比上周 ${deltaText}。`,
    taskSummary: `平均任务完成率 ${averageRate}%，待审核 ${metrics.pendingReviews} 条。`,
    rewardSummary: `本周共发放奖励 ${metrics.rewardsIssued} 份，核销 ${metrics.rewardsRedeemed} 份，核销率 ${metrics.redemptionRate}%。`,
    recommendation: mainTaskTitle
      ? `建议本周主打「${mainTaskTitle}」，把员工引导话术和桌贴提示都聚焦到这个任务。`
      : "建议先提升碰卡开局量，再观察任务完成率与核销转化。",
    mainTaskTitle,
  };
}

function buildFallbackSuggestions(metrics: AdvisorMetrics, report: AdvisorWeeklyReport): AdvisorSuggestion[] {
  const bestPlatform = metrics.platformDistribution[0]?.platform ?? "主要平台";
  const bestTask = report.mainTaskTitle ?? "首个打卡任务";
  const pendingText = metrics.pendingReviews > 0
    ? `优先处理 ${metrics.pendingReviews} 条待审核，避免用户等待后流失。`
    : "暂无积压审核，可以把重点放到现场引导和奖励露出。";

  return [
    {
      type: "today",
      title: suggestionTitles.today,
      content: pendingText,
    },
    {
      type: "weekly",
      title: suggestionTitles.weekly,
      content: `${report.summary}${report.taskSummary}${report.rewardSummary}`,
    },
    {
      type: "dish",
      title: suggestionTitles.dish,
      content: `围绕「${bestTask}」做主推，店员介绍时先强调完成方式和可领权益。`,
    },
    {
      type: "reward",
      title: suggestionTitles.reward,
      content: metrics.redemptionRate < 30
        ? "核销率偏低，建议把奖励有效期和到店出示方式放到更醒目的位置。"
        : "核销表现稳定，可以保持当前奖励力度，并测试限量权益提升紧迫感。",
    },
    {
      type: "script",
      title: suggestionTitles.script,
      content: `建议话术：今天参与门店寻宝，完成${bestTask}后可以领券，到店出示核销码即可使用。`,
    },
    {
      type: "dark_horse",
      title: suggestionTitles.dark_horse,
      content: `${bestPlatform} 带来的互动更值得继续放大，优先复用当前表现好的任务说明。`,
    },
  ];
}

function buildAdvisorSystemPrompt() {
  return [
    "你是门店运营顾问，服务对象是餐饮门店店长。",
    "请根据数据输出具体、短句、可执行的建议。",
    "只返回 JSON，不要 Markdown，不要额外解释。",
    "JSON 格式：{\"suggestions\":[{\"type\":\"today|weekly|dish|reward|script|dark_horse\",\"title\":\"...\",\"content\":\"...\"}]}。",
  ].join("\n");
}

function buildAdvisorUserPrompt(metrics: AdvisorMetrics, report: AdvisorWeeklyReport) {
  const taskLines = metrics.taskCompletionRates
    .map((task) => `${task.title}: 完成率 ${task.completionRate}%，通过 ${task.approvedCount}/${task.participants}`)
    .join("\n");
  const platformLines = metrics.platformDistribution
    .map((item) => `${item.platform}: ${item.count}`)
    .join("，") || "暂无平台跳转";

  return [
    "你是门店运营顾问。基于以下数据给出运营建议：",
    `本周参与人数：${metrics.currentParticipants}`,
    `上周参与人数：${metrics.previousParticipants}`,
    `参与人数环比：${metrics.participantDeltaPercent}%`,
    `待审核：${metrics.pendingReviews}`,
    `奖励领取：${metrics.rewardsIssued}`,
    `奖励核销：${metrics.rewardsRedeemed}`,
    `核销率：${metrics.redemptionRate}%`,
    `任务完成率：\n${taskLines || "暂无任务数据"}`,
    `平台跳转分布：${platformLines}`,
    `当前周报建议：${report.recommendation}`,
    "请返回 6 条建议，type 必须覆盖 today、weekly、dish、reward、script、dark_horse。每条 content 不超过 70 个中文字符。",
  ].join("\n");
}

function normalizeSuggestions(value: unknown): AdvisorSuggestion[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const suggestions = (value as { suggestions?: unknown }).suggestions;
  if (!Array.isArray(suggestions)) return [];

  const normalized = suggestions
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const record = item as Record<string, unknown>;
      const type = typeof record.type === "string" && suggestionTypes.includes(record.type as AdvisorSuggestionType)
        ? (record.type as AdvisorSuggestionType)
        : null;
      const title = typeof record.title === "string" && record.title.trim()
        ? record.title.trim()
        : type ? suggestionTitles[type] : null;
      const content = typeof record.content === "string" ? record.content.trim() : "";

      if (!type || !title || !content) return null;
      return { type, title, content };
    })
    .filter((item): item is AdvisorSuggestion => Boolean(item));

  const byType = new Map<AdvisorSuggestionType, AdvisorSuggestion>();
  for (const item of normalized) {
    if (!byType.has(item.type)) byType.set(item.type, item);
  }

  return suggestionTypes
    .map((type) => byType.get(type))
    .filter((item): item is AdvisorSuggestion => Boolean(item));
}

function parseJsonFromText(rawText: string) {
  const text = rawText.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced ?? text.match(/\{[\s\S]*\}/)?.[0] ?? text;
  return JSON.parse(candidate);
}

async function requestMiniMaxAdvisor(metrics: AdvisorMetrics, report: AdvisorWeeklyReport) {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error("MiniMax API key is not configured");
  }

  const response = await fetch("https://api.minimax.chat/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.MINIMAX_MODEL ?? "MiniMax-M2.7",
      messages: [
        { role: "system", content: buildAdvisorSystemPrompt() },
        { role: "user", content: buildAdvisorUserPrompt(metrics, report) },
      ],
      max_tokens: 900,
      temperature: 0.6,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`MiniMax advisor request failed: ${response.status} ${detail.slice(0, 180)}`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content ?? "";
  const parsed = parseJsonFromText(rawText);
  const suggestions = normalizeSuggestions(parsed);

  if (suggestions.length === 0) {
    throw new Error("MiniMax advisor returned no suggestions");
  }

  return suggestions;
}

export async function getMerchantAdvisor(input: {
  merchantId: string;
  includeSuggestions: boolean;
}): Promise<MerchantAdvisorPayload> {
  const today = startOfToday();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const previousSevenDaysAgo = new Date(sevenDaysAgo);
  previousSevenDaysAgo.setDate(previousSevenDaysAgo.getDate() - 7);

  const stores = await prisma.store.findMany({
    where: { merchantId: input.merchantId },
    select: { id: true },
  });
  const storeIds = stores.map((store) => store.id);

  const campaigns = await prisma.campaign.findMany({
    where: { merchantId: { in: storeIds } },
    select: { id: true },
  });
  const campaignIds = campaigns.map((campaign) => campaign.id);

  const tasks = await prisma.campaignTask.findMany({
    where: { campaignId: { in: campaignIds } },
    select: { id: true, title: true, sortOrder: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const [
    currentParticipants,
    previousParticipants,
    pendingReviews,
    rewardsIssued,
    rewardsRedeemed,
    approvedSubmissions,
    platformEvents,
  ] = await Promise.all([
    prisma.participation.count({
      where: { campaignId: { in: campaignIds }, createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.participation.count({
      where: {
        campaignId: { in: campaignIds },
        createdAt: { gte: previousSevenDaysAgo, lt: sevenDaysAgo },
      },
    }),
    prisma.taskSubmission.count({
      where: { status: TaskStatus.SUBMITTED, task: { campaignId: { in: campaignIds } } },
    }),
    prisma.redemption.count({
      where: { reward: { campaignId: { in: campaignIds } }, createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.redemption.count({
      where: {
        status: ClaimStatus.USED,
        reward: { campaignId: { in: campaignIds } },
        redeemedAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.taskSubmission.groupBy({
      by: ["taskId"],
      where: {
        status: TaskStatus.APPROVED,
        submittedAt: { gte: sevenDaysAgo },
        task: { campaignId: { in: campaignIds } },
      },
      _count: { _all: true },
    }),
    prisma.event.findMany({
      where: {
        eventType: EventType.platform_jump,
        campaignId: { in: campaignIds },
        createdAt: { gte: sevenDaysAgo },
      },
      select: { metadata: true },
    }),
  ]);

  const approvedByTaskId = new Map(
    approvedSubmissions.map((item) => [item.taskId, item._count._all])
  );
  const taskCompletionRates = tasks.map((task) => {
    const approvedCount = approvedByTaskId.get(task.id) ?? 0;
    return {
      taskId: task.id,
      title: task.title,
      sortOrder: task.sortOrder,
      approvedCount,
      participants: currentParticipants,
      completionRate: percent(approvedCount, currentParticipants),
    };
  });

  const platformCounts = new Map<string, number>();
  for (const event of platformEvents) {
    const platform = platformLabel(readMetadataString(event.metadata, "platform") ?? "unknown");
    platformCounts.set(platform, (platformCounts.get(platform) ?? 0) + 1);
  }

  const platformDistribution = Array.from(platformCounts.entries())
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count);

  const averageTaskCompletionRate = taskCompletionRates.length
    ? Math.round(taskCompletionRates.reduce((sum, task) => sum + task.completionRate, 0) / taskCompletionRates.length)
    : 0;

  const metrics: AdvisorMetrics = {
    currentParticipants,
    previousParticipants,
    participantDeltaPercent: deltaPercent(currentParticipants, previousParticipants),
    pendingReviews,
    rewardsIssued,
    rewardsRedeemed,
    redemptionRate: percent(rewardsRedeemed, rewardsIssued),
    averageTaskCompletionRate,
    taskCompletionRates,
    platformDistribution,
  };
  const weeklyReport = buildWeeklyReport(metrics);

  if (!input.includeSuggestions) {
    return {
      metrics,
      weeklyReport,
      suggestions: [],
      generatedAt: new Date().toISOString(),
      source: "metrics",
    };
  }

  try {
    const suggestions = await requestMiniMaxAdvisor(metrics, weeklyReport);
    return {
      metrics,
      weeklyReport,
      suggestions,
      generatedAt: new Date().toISOString(),
      source: "ai",
    };
  } catch {
    return {
      metrics,
      weeklyReport,
      suggestions: buildFallbackSuggestions(metrics, weeklyReport),
      generatedAt: new Date().toISOString(),
      source: "fallback",
    };
  }
}
