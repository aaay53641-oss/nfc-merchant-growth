export type TaskStatus = "LOCKED" | "AVAILABLE" | "SUBMITTED" | "APPROVED";

export type TaskKind = "NFC_WECHAT" | "PHOTO_REVIEW" | "CONTENT_POST";

export type SubmitTaskType = "l2-photo" | "l2-review" | "l3-douyin" | "l3-xiaohongshu";

export type CopyPlatform = "meituan" | "xiaohongshu" | "douyin" | "dianping" | "baidu" | "weixin_moments";

export interface H5Merchant {
  name: string;
  logo: string;
  address: string;
  businessHours: string;
  phone: string;
  verified?: boolean;
}

export interface H5Campaign {
  id: string;
  title: string;
  subtitle: string;
  guide: string;
  startDate: string;
  endDate: string;
  merchant: H5Merchant;
}

export interface H5Task {
  id: "l1" | "l2" | "l3";
  apiTaskId?: string;
  level: number;
  kind: TaskKind;
  title: string;
  shortTitle: string;
  description: string;
  reward: string;
  guide: string;
  steps: string[];
  estimatedTime: string;
}

export interface H5Reward {
  id: "r1" | "r2" | "r3";
  apiRewardId?: string;
  taskId: H5Task["id"];
  name: string;
  description: string;
  validUntil: string;
  useStores: string;
  totalStock?: number;
  remainingStock?: number;
  claimedCount?: number;
  isSoldOut?: boolean;
  redemption?: {
    id: string;
    code: string;
    status: "UNCLAIMED" | "CLAIMED" | "USED" | "EXPIRED" | "CANCELLED";
    redeemedAt: string | null;
  } | null;
}

export interface AllianceCoupon {
  id: string;
  merchantName: string;
  name: string;
  description: string;
  validUntil: string;
}

export interface GeneratedCopy {
  id: string;
  platform: CopyPlatform;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
}

export interface Submission {
  id: string;
  taskType: SubmitTaskType;
  taskId: H5Task["id"];
  proofType: "SCREENSHOT" | "LINK";
  imageUrl?: string;
  link?: string;
  note?: string;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  submittedAt: string;
}

export interface H5Media {
  id: string;
  campaignId: string;
  url: string;
  mediaType: "IMAGE" | "VIDEO";
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
}

export interface H5FlowState {
  participation: {
    id: string;
    openid: string;
    campaignId: string;
    currentTask: number;
    status: string;
  };
  campaign: {
    id: string;
    title: string;
    storeName: string;
    storeAddress: string | null;
    merchantName: string;
    lotteryDailyQuota: number;
    lotteryDrawTime: string | null;
    lotteryMinScore: number;
    lotteryActive: boolean;
  };
  tasks: Array<{
    id: H5Task["id"];
    apiTaskId: string;
    sortOrder: number;
    title: string;
    description: string | null;
    status: TaskStatus | "REJECTED";
    reward: {
      id: string;
      name: string;
      description: string | null;
      type: string;
      quantity: number;
    } | null;
    submission: {
      id: string;
      status: string;
      platformLink: string | null;
      imageUrls: string[];
      reviewNote: string | null;
      submittedAt: string;
    } | null;
    verification: {
      id: string;
      method: string;
      platform: string | null;
      link: string | null;
      screenshotUrl: string | null;
      status: string;
      reviewNote: string | null;
      qualityScore: number | null;
      lotteryChances: number;
    } | null;
  }>;
  rewards: Array<{
    id: string;
    name: string;
    description: string | null;
    type: string;
    quantity: number;
    taskId: H5Task["id"] | null;
    category: "available" | "pending" | "used" | "expired" | "lost";
    redemption: {
      id: string;
      code: string;
      status: string;
      redeemedAt: string | null;
      createdAt: string;
    } | null;
  }>;
  lottery: {
    todayQuota: number;
    poolCount: number;
    drawTime: string | null;
    active: boolean;
    minScore: number;
    entry: {
      id: string;
      weight: number;
      status: string;
      qualityScore: number | null;
      drawnAt: string | null;
    } | null;
  };
}
