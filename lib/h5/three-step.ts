import type { CopyPlatform, H5Media } from "@/lib/h5/types";

export type ReviewPlatform = "meituan" | "dianping" | "douyin" | "baidu";
export type ContentForm = "image_text" | "video" | "moments";

export const step2Tags = [
  "口味不错",
  "环境舒服",
  "适合聚餐",
  "分量可以",
  "服务挺好",
  "性价比还行",
  "适合拍照",
  "上菜较快",
  "招牌菜可以尝试",
  "适合朋友小聚",
];

export const reviewPlatforms: Array<{
  platform: ReviewPlatform;
  platformName: string;
  jumpUrl: string;
  copyPlatform: CopyPlatform;
  copyStyle: string;
  imageRequired: boolean;
}> = [
  {
    platform: "meituan",
    platformName: "美团评价",
    jumpUrl: "https://www.meituan.com",
    copyPlatform: "meituan",
    copyStyle: "真实体验",
    imageRequired: true,
  },
  {
    platform: "dianping",
    platformName: "大众点评",
    jumpUrl: "https://www.dianping.com",
    copyPlatform: "dianping",
    copyStyle: "信息完整",
    imageRequired: true,
  },
  {
    platform: "douyin",
    platformName: "抖音团购评价",
    jumpUrl: "https://www.douyin.com",
    copyPlatform: "douyin",
    copyStyle: "短视频口播",
    imageRequired: true,
  },
  {
    platform: "baidu",
    platformName: "百度点评",
    jumpUrl: "https://map.baidu.com",
    copyPlatform: "baidu",
    copyStyle: "客观直接",
    imageRequired: true,
  },
];

export const step3Platforms: Array<{ platform: CopyPlatform; label: string; hint: string; url: string }> = [
  { platform: "xiaohongshu", label: "小红书", hint: "4-6张图，标题清楚", url: "https://www.xiaohongshu.com" },
  { platform: "douyin", label: "抖音", hint: "8-30秒视频，自然讲述", url: "https://www.douyin.com" },
  { platform: "weixin_moments", label: "朋友圈", hint: "1-3张图和真实感受", url: "https://weixin.qq.com" },
  { platform: "dianping", label: "大众点评", hint: "图文完整，细节可信", url: "https://www.dianping.com" },
];

export type StepDraft = {
  platform: string;
  platformName: string;
  jumpUrl: string;
  tags: string[];
  images: Array<Pick<H5Media, "id" | "url" | "title" | "category"> & { source: "merchant" | "local" }>;
  title: string;
  content: string;
  aiTags: string[];
  userFeeling: string;
  contentForm?: ContentForm;
};

export function storageKey(campaignId: string, step: 2 | 3) {
  return `sprint10:${campaignId}:step-${step}`;
}

export function readStepDraft(campaignId: string, step: 2 | 3): StepDraft | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(storageKey(campaignId, step));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StepDraft;
  } catch {
    return null;
  }
}

export function writeStepDraft(campaignId: string, step: 2 | 3, draft: StepDraft) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(storageKey(campaignId, step), JSON.stringify(draft));
}

export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}
