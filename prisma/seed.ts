import {
  PrismaClient,
  CampaignStatus,
  TaskType,
  TaskStatus,
  VerifyType,
  RewardType,
  CardStatus,
  Role,
  Status,
} from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();
const sha256 = (s: string) => createHash("sha256").update(`${s}:nfc-merchant-salt`).digest("hex");
const PASS = sha256("123456");

async function main() {
  console.log("🌱 Seeding database...");

  // 清理旧数据（按依赖顺序）
  await prisma.auditLog.deleteMany();
  await prisma.event.deleteMany();
  await prisma.aIGeneration.deleteMany();
  await prisma.couponClaim.deleteMany();
  await prisma.allianceCoupon.deleteMany();
  await prisma.alliancePartner.deleteMany();
  await prisma.redemption.deleteMany();
  await prisma.rewardClaim.deleteMany();
  await prisma.taskSubmission.deleteMany();
  await prisma.participation.deleteMany();
  await prisma.reward.deleteMany();
  await prisma.campaignTask.deleteMany();
  await prisma.campaignStore.deleteMany();
  await prisma.nfcCard.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.store.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.merchant.deleteMany();
  await prisma.user.deleteMany();

  // 创建平台管理员
  const platformUser = await prisma.user.create({
    data: {
      email: "platform@example.com",
      password: PASS,
      role: Role.PLATFORM,
      nickname: "平台管理员",
    },
  });

  // 创建商家管理员
  const merchantUser = await prisma.user.create({
    data: {
      email: "merchant@shuxiang.com",
      password: PASS,
      role: Role.MERCHANT,
      nickname: "蜀巷火锅",
    },
  });

  // 创建商家
  const merchant = await prisma.merchant.create({
    data: {
      name: "蜀巷火锅",
      description: "成都连锁火锅品牌，主打麻辣牛油锅底",
      logo: "🔥",
      contact: "张老板",
      phone: "138-0013-8000",
      address: "北京市朝阳区国贸商圈88号",
      status: Status.APPROVED,
      userId: merchantUser.id,
    },
  });

  // 创建门店
  const store = await prisma.store.create({
    data: {
      name: "蜀巷火锅国贸店",
      address: "北京市朝阳区国贸商圈88号",
      phone: "010-6500-8888",
      merchantId: merchant.id,
    },
  });

  // 创建活动（Campaign.merchantId 实际关联 Store.id）
  const campaign = await prisma.campaign.create({
    data: {
      title: "寻宝探店·吃遍全城",
      description: "碰一碰解锁宝藏好礼，三关闯完吃遍整条街",
      coverImage: "/campaign-cover.jpg",
      startDate: new Date("2026-05-01"),
      endDate: new Date("2026-08-31"),
      status: CampaignStatus.ACTIVE,
      merchantId: store.id,
    },
  });

  // 多对多关联
  await prisma.campaignStore.create({
    data: { campaignId: campaign.id, storeId: store.id },
  });

  // 创建奖励
  const reward1 = await prisma.reward.create({
    data: {
      campaignId: campaign.id,
      type: RewardType.FREE_DRINK,
      name: "免费指定饮品",
      description: "招牌柠檬水 / 当日特调 / 鲜榨果汁任选一杯",
      quantity: 100,
    },
  });

  const reward2 = await prisma.reward.create({
    data: {
      campaignId: campaign.id,
      type: RewardType.SIGNATURE_DISH,
      name: "招牌荤菜兑换券",
      description: "招牌口水鸡 / 秘制红烧肉 / 农家小炒肉任选一份",
      quantity: 50,
    },
  });

  const reward3 = await prisma.reward.create({
    data: {
      campaignId: campaign.id,
      type: RewardType.DESSERT,
      name: "甜品 + 霸王餐抽奖",
      description: "手作布丁 / 杨枝甘露 / 红糖糍粑任选一份，并获得抽奖资格",
      quantity: 30,
    },
  });

  // 创建三关任务
  const task1 = await prisma.campaignTask.create({
    data: {
      campaignId: campaign.id,
      taskType: TaskType.NFC_SCAN,
      title: "第一关 · 进门有礼",
      description: "触碰桌上 NFC 贴纸，添加企业微信，开启你的寻宝之旅。",
      completionRule: "碰一碰桌上 NFC 贴纸，再按页面提示添加企业微信",
      verifyType: VerifyType.AUTO,
      sortOrder: 1,
      rewardId: reward1.id,
      status: TaskStatus.AVAILABLE,
    },
  });

  const task2 = await prisma.campaignTask.create({
    data: {
      campaignId: campaign.id,
      taskType: TaskType.PHOTO_CHECKIN,
      title: "第二关 · 打卡有礼",
      description: "找到门店特色打卡点，拍照留念并完成大众点评真实打卡。",
      completionRule: "上传打卡照片或点评截图，审核通过后领取招牌菜",
      verifyType: VerifyType.MANUAL_REVIEW,
      sortOrder: 2,
      rewardId: reward2.id,
      status: TaskStatus.LOCKED,
    },
  });

  const task3 = await prisma.campaignTask.create({
    data: {
      campaignId: campaign.id,
      taskType: TaskType.DOUYIN_POST,
      title: "第三关 · 裂变有礼",
      description: "任选平台发布真实种草内容，提交链接后领取甜品和抽奖资格。",
      completionRule: "先用 AI 文案助手生成内容，再发布并提交链接",
      verifyType: VerifyType.LINK,
      sortOrder: 3,
      rewardId: reward3.id,
      status: TaskStatus.LOCKED,
    },
  });

  // 创建 NFC 卡
  await prisma.nfcCard.create({
    data: {
      code: "NFC-SHUXiang-001",
      storeId: store.id,
      campaignId: campaign.id,
      tableNumber: "A01",
      status: CardStatus.ACTIVE,
    },
  });

  await prisma.nfcCard.create({
    data: {
      code: "NFC-SHUXiang-002",
      storeId: store.id,
      campaignId: campaign.id,
      tableNumber: "A02",
      status: CardStatus.ACTIVE,
    },
  });

  // 创建异业联盟商家
  const partner1 = await prisma.alliancePartner.create({
    data: {
      name: "观影工场",
      type: "电影院",
      contactName: "李经理",
      contactPhone: "139-0001-9001",
      status: Status.ACTIVE,
      merchantId: merchant.id,
    },
  });

  await prisma.allianceCoupon.create({
    data: {
      name: "电影票8折",
      description: "完成三关后可领取，周末通用",
      discount: 20,
      validFrom: new Date("2026-05-01"),
      validUntil: new Date("2026-08-31"),
      partnerId: partner1.id,
    },
  });

  console.log("✅ Seed completed!");
  console.log({
    merchant: merchant.name,
    store: store.name,
    campaign: campaign.title,
    tasks: [task1.title, task2.title, task3.title],
    rewards: [reward1.name, reward2.name, reward3.name],
  });
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
