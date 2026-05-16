export type TaskStatus = "LOCKED" | "AVAILABLE" | "SUBMITTED" | "APPROVED";

export type TaskKind = "NFC_WECHAT" | "PHOTO_REVIEW" | "CONTENT_POST";

export type SubmitTaskType = "l2-photo" | "l2-review" | "l3-douyin" | "l3-xiaohongshu";

export type CopyPlatform = "xiaohongshu" | "douyin" | "dianping" | "weixin_moments";

export interface H5Merchant {
  name: string;
  logo: string;
  address: string;
  businessHours: string;
  phone: string;
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
  taskId: H5Task["id"];
  name: string;
  description: string;
  validUntil: string;
  useStores: string;
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
