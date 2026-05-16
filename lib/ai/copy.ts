import { z } from "zod";

import { HttpError } from "@/lib/api/errors";

export const copyPlatformSchema = z.enum([
  "xiaohongshu",
  "douyin",
  "dianping",
  "weixin_moments",
]);

export const copyStyleSchema = z.enum([
  "vibe",
  "deal_hunter",
  "foodie_review",
  "real_experience",
  "date_night",
  "friend_gathering",
]);

export const aiCopyRequestSchema = z.object({
  storeName: z.string().trim().min(1),
  cuisineType: z.string().trim().min(1),
  signatureDishes: z.array(z.string().trim().min(1)).min(1).max(6),
  environmentStyle: z.string().trim().min(1),
  platform: copyPlatformSchema,
  style: copyStyleSchema,
  userFeeling: z.string().trim().min(1),
});

export type CopyPlatform = z.infer<typeof copyPlatformSchema>;
export type CopyStyle = z.infer<typeof copyStyleSchema>;
export type AICopyRequest = z.infer<typeof aiCopyRequestSchema>;

export type AICopyResult = {
  title: string;
  content: string;
  tags: string[];
  platform: CopyPlatform;
};

const platformRules: Record<CopyPlatform, string> = {
  xiaohongshu:
    "小红书笔记：标题20字以内，正文300-500字，短句、真实、有温度，包含3-5个话题标签。",
  douyin:
    "抖音脚本：开头3秒hook，正文适合15-60秒短视频口播，给出画面感和结尾互动。",
  dianping:
    "大众点评评价：客观真实、信息量大，包含店铺信息、菜品推荐、服务体验和总结。",
  weixin_moments:
    "朋友圈文案：100字以内，像朋友自然分享，不要硬广，建议图片和定位。",
};

const styleRules: Record<CopyStyle, string> = {
  vibe: "氛围感：强调空间、灯光、情绪和拍照体验。",
  deal_hunter: "性价比：强调分量、预算友好和适合聚餐的价值感。",
  foodie_review: "探店风：强调发现感、路线感、推荐理由和个人体验。",
  real_experience: "真实体验：语气克制，保留具体细节和可信感。",
  date_night: "约会聚餐：强调舒适、仪式感和适合两人到店。",
  friend_gathering: "朋友聚会：强调热闹、分享、一起吃更开心。",
};

const replacements: Array<[RegExp, string]> = [
  [/全网最|全国第一|第一名|最顶级|顶级享受/g, "很有记忆点"],
  [/最好吃/g, "味道真的不错"],
  [/绝对|100%保证|百分百保证/g, "我个人感觉"],
  [/所有人都适合|没有人不喜欢/g, "适合不少朋友"],
  [/吃了就能瘦|健康减肥/g, "吃起来负担感不重"],
  [/立即|马上|现在不薅就亏/g, "有机会可以试试"],
  [/不去后悔一辈子/g, "有机会可以去试试"],
  [/强烈推荐|必须来|必点/g, "我个人很推荐"],
  [/原价\s*\d+\s*现价\s*\d+/g, "近期活动价"],
];

export function sanitizeCopyText(text: string) {
  return replacements.reduce((current, [pattern, replacement]) => {
    return current.replace(pattern, replacement);
  }, text);
}

function sanitizeResult(result: AICopyResult): AICopyResult {
  return {
    ...result,
    title: sanitizeCopyText(result.title).slice(0, 60),
    content: sanitizeCopyText(result.content),
    tags: result.tags
      .map((tag) => sanitizeCopyText(tag).replace(/^#*/, "").trim())
      .filter(Boolean)
      .slice(0, 6),
  };
}

function fallbackCopy(input: AICopyRequest): AICopyResult {
  const dishes = input.signatureDishes.join("、");
  const userFeeling = input.userFeeling.replace(/[。！？!?\s]+$/g, "");
  const tags =
    input.platform === "dianping"
      ? ["真实探店", input.cuisineType, "朋友聚餐"]
      : ["探店", input.cuisineType, input.storeName.replace(/\s+/g, "")];

  const contentByPlatform: Record<CopyPlatform, string> = {
    xiaohongshu: `今天在${input.storeName}吃到一顿挺舒服的${input.cuisineType}。\n\n店里是${input.environmentStyle}的感觉，适合和朋友慢慢坐下来吃。${dishes}都挺有记忆点，尤其是第一口的香气和分量，让人觉得这趟没白来。\n\n我的感受是：${userFeeling}。如果你也想找一家适合聚餐、拍照、顺手参与到店小活动的店，可以把这里放进清单。\n\n#${tags.join(" #")}`,
    douyin: `开头画面：镜头推进到${input.storeName}门口，桌上热气和菜品特写快速切换。\n\n口播：今天这家${input.cuisineType}让我眼前一亮。环境是${input.environmentStyle}，坐下之后先拍${dishes}，画面很容易出片。我的真实感受是：${userFeeling}。\n\n结尾：想看更多这种到店可玩、还能解锁福利的店，评论区告诉我你想去哪个商圈。`,
    dianping: `【店铺信息】\n${input.storeName}主打${input.cuisineType}，整体环境偏${input.environmentStyle}，适合朋友聚餐或下班后约饭。\n\n【菜品推荐】\n这次比较推荐${dishes}。口味稳定，分量和出品都比较有记忆点，适合第一次到店的朋友参考。\n\n【体验感受】\n${userFeeling}。整体体验比较完整，拍照、用餐和活动参与都比较顺。\n\n【总结】\n如果想找一家适合聚餐、顺手打卡的店，可以考虑来试试。`,
    weixin_moments: `今天吃到一家还不错的${input.cuisineType}：${input.storeName}。\n${dishes}挺有记忆点，店里是${input.environmentStyle}的感觉。\n${userFeeling}，有机会可以约朋友一起来。`,
  };

  return sanitizeResult({
    title:
      input.platform === "douyin"
        ? `${input.storeName}探店脚本`
        : `${input.storeName}真实探店`,
    content: contentByPlatform[input.platform],
    tags,
    platform: input.platform,
  });
}

function buildSystemPrompt(input: AICopyRequest) {
  return [
    "你是一个中文本地生活美食种草文案助手。",
    "目标是帮助真实到店用户写出可发布、可信、合规的体验内容。",
    "必须只输出 JSON，格式为 {\"title\":\"...\",\"content\":\"...\",\"tags\":[\"...\"],\"platform\":\"...\"}。",
    "不要输出 Markdown 代码块，不要解释。",
    "严禁虚假承诺、绝对化排名、医疗健康承诺、竞品拉踩、隐私泄露、政治敏感内容。",
    platformRules[input.platform],
    styleRules[input.style],
  ].join("\n");
}

function buildUserPrompt(input: AICopyRequest) {
  return [
    `店铺名称：${input.storeName}`,
    `菜系/品类：${input.cuisineType}`,
    `招牌菜：${input.signatureDishes.join("、")}`,
    `环境风格：${input.environmentStyle}`,
    `用户真实感受：${input.userFeeling}`,
    `发布平台：${input.platform}`,
    `文案风格：${input.style}`,
    "请生成一版适合直接复制发布的中文文案。",
  ].join("\n");
}

function parseCopyJson(rawText: string, platform: CopyPlatform): AICopyResult {
  const jsonText = rawText.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
  const parsed = JSON.parse(jsonText) as Partial<AICopyResult>;

  if (!parsed.title || !parsed.content || !Array.isArray(parsed.tags)) {
    throw new Error("AI response is missing required fields");
  }

  return sanitizeResult({
    title: parsed.title,
    content: parsed.content,
    tags: parsed.tags.map(String),
    platform,
  });
}

async function requestMiniMaxCopy(input: AICopyRequest) {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new HttpError("MiniMax API key is not configured", 503);
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
        { role: "system", content: buildSystemPrompt(input) },
        { role: "user", content: buildUserPrompt(input) },
      ],
      max_tokens: 900,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`MiniMax request failed: ${response.status} ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content ?? "";
  return parseCopyJson(rawText, input.platform);
}

export async function generateAICopy(input: AICopyRequest): Promise<AICopyResult> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await requestMiniMaxCopy(input);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      lastError = error;
    }
  }

  console.warn("[ai-copy] using fallback copy after generation failure", lastError);
  return fallbackCopy(input);
}
