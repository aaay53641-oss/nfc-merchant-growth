import type { AllianceCoupon, CopyPlatform, H5Campaign, H5Reward, H5Task } from "@/lib/h5/types";

export const mockCampaign: H5Campaign = {
  id: "demo",
  title: "寻宝探店·吃遍全城",
  subtitle: "碰一碰解锁宝藏好礼，三关闯完吃遍整条街",
  guide: "到店必玩 · 闯关寻宝 · 好礼带回家",
  startDate: "2026.05.01",
  endDate: "2026.08.31",
  merchant: {
    name: "蜀巷火锅国贸店",
    logo: "火",
    address: "北京市朝阳区国贸商圈 88 号",
    businessHours: "11:00 - 23:30",
    phone: "400-123-4567",
    verified: true,
  },
};

export const mockTasks: H5Task[] = [
  {
    id: "l1",
    level: 1,
    kind: "NFC_WECHAT",
    title: "第一关 · 进门有礼",
    shortTitle: "NFC贴纸 + 添加微信",
    description: "触碰桌上 NFC 贴纸，添加企业微信，开启你的寻宝之旅。",
    reward: "免费指定饮品一杯",
    guide: "用手机碰一碰桌贴，再按页面提示添加企业微信。",
    estimatedTime: "约 10 秒",
    steps: ["碰一碰桌上 NFC 贴纸", "添加门店企业微信", "等待系统发放进门礼"],
  },
  {
    id: "l2",
    level: 2,
    kind: "PHOTO_REVIEW",
    title: "第二关 · 打卡有礼",
    shortTitle: "拍照打卡 + 大众点评",
    description: "找到门店特色打卡点，拍照留念并完成大众点评真实打卡。",
    reward: "招牌荤菜兑换券一张",
    guide: "上传打卡照片或点评截图，审核通过后领取招牌菜。",
    estimatedTime: "约 30 秒",
    steps: ["到网红打卡墙拍照", "跳转大众点评完成打卡", "上传截图等待审核"],
  },
  {
    id: "l3",
    level: 3,
    kind: "CONTENT_POST",
    title: "第三关 · 裂变有礼",
    shortTitle: "发布抖音 / 小红书内容",
    description: "任选平台发布真实种草内容，提交链接后领取甜品和抽奖资格。",
    reward: "甜品一份 + 霸王餐抽奖资格",
    guide: "先用 AI 文案助手生成内容，再发布并提交链接。",
    estimatedTime: "约 2 分钟",
    steps: ["选择抖音或小红书", "生成并复制种草文案", "发布后提交链接"],
  },
];

export const mockRewards: H5Reward[] = [
  {
    id: "r1",
    taskId: "l1",
    name: "免费指定饮品",
    description: "招牌柠檬水 / 当日特调 / 鲜榨果汁任选一杯",
    validUntil: "当天营业结束前",
    useStores: "蜀巷火锅国贸店",
    totalStock: 100,
    remainingStock: 84,
    claimedCount: 16,
    isSoldOut: false,
  },
  {
    id: "r2",
    taskId: "l2",
    name: "招牌荤菜兑换券",
    description: "招牌口水鸡 / 秘制红烧肉 / 农家小炒肉任选一份",
    validUntil: "当天营业结束前",
    useStores: "蜀巷火锅国贸店",
    totalStock: 50,
    remainingStock: 31,
    claimedCount: 19,
    isSoldOut: false,
  },
  {
    id: "r3",
    taskId: "l3",
    name: "甜品 + 霸王餐抽奖",
    description: "手作布丁 / 杨枝甘露 / 红糖糍粑任选一份，并获得抽奖资格",
    validUntil: "当天营业结束前",
    useStores: "蜀巷火锅国贸店",
    totalStock: 30,
    remainingStock: 12,
    claimedCount: 18,
    isSoldOut: false,
  },
];

export const mockAllianceCoupons: AllianceCoupon[] = [
  {
    id: "a1",
    merchantName: "观影工场",
    name: "电影票 8 折",
    description: "完成三关后可领取，周末通用",
    validUntil: "2026.08.31",
  },
  {
    id: "a2",
    merchantName: "街角咖啡",
    name: "指定咖啡买一送一",
    description: "到店出示本券即可使用",
    validUntil: "2026.08.31",
  },
  {
    id: "a3",
    merchantName: "跃动健身",
    name: "体验课 0 元预约",
    description: "新客限定，每人限领一次",
    validUntil: "2026.08.31",
  },
];

export const platformLinks: Record<CopyPlatform, string> = {
  meituan: "https://www.meituan.com",
  xiaohongshu: "https://www.xiaohongshu.com",
  douyin: "https://www.douyin.com",
  dianping: "https://www.dianping.com",
  baidu: "https://map.baidu.com",
  weixin_moments: "https://weixin.qq.com",
};

export function buildMockCopies(): Array<Omit<import("@/lib/h5/types").GeneratedCopy, "id" | "createdAt">> {
  return [
    {
      platform: "xiaohongshu",
      title: "小红书种草",
      content:
        "和朋友在国贸发现一家很适合聚餐的火锅店。锅底香气很足，招牌荤菜分量扎实，拍照也很出片。今天碰 NFC 还能解锁门店福利，到店先领一杯饮品，吃饭前的小惊喜很加分。\n\n#北京美食 #国贸探店 #火锅打卡",
      tags: ["北京美食", "国贸探店", "火锅打卡"],
    },
    {
      platform: "douyin",
      title: "抖音短视频",
      content:
        "国贸这家火锅店，进门先碰一下桌贴就能领饮品。镜头先拍锅底沸腾，再切招牌荤菜，最后拍朋友举杯。文案：花一顿饭的时间，解锁三重到店福利，今天这顿有点会玩。",
      tags: ["国贸美食", "火锅探店", "到店福利"],
    },
    {
      platform: "dianping",
      title: "大众点评评价",
      content:
        "位置在国贸商圈，交通方便，适合朋友聚餐。门店环境干净，座位间距舒适。推荐招牌口水鸡和秘制红烧肉，口味稳定，分量比较足。服务响应快，整体体验适合下班后聚餐或周末约饭。",
      tags: ["朋友聚餐", "国贸商圈", "火锅"],
    },
  ];
}

export async function fetchH5Campaign(campaignId: string) {
  return { ...mockCampaign, id: campaignId };
}

export async function fetchH5Tasks() {
  return mockTasks;
}

export async function fetchH5Rewards() {
  return mockRewards;
}
