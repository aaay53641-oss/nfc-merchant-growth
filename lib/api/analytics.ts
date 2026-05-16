import { CampaignStatus } from "@prisma/client";

import { HttpError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";

type NumericValue = bigint | number | string | null | undefined | { toNumber: () => number };

export type DailyOverviewTrend = {
  date: string;
  participations: number;
  tasksCompleted: number;
  rewardsClaimed: number;
  rewardsRedeemed: number;
};

export type PlatformOverview = {
  totalCampaigns: number;
  activeCampaigns: number;
  totalParticipations: number;
  totalTasksCompleted: number;
  totalRewardsClaimed: number;
  totalRewardsRedeemed: number;
  redemptionRate: number;
  avgTasksPerParticipation: number;
  topCampaigns: Array<{
    id: string;
    name: string;
    storeName: string;
    participations: number;
    completionRate: number;
  }>;
  dailyTrend: DailyOverviewTrend[];
  campaignStatusDistribution: Array<{ status: CampaignStatus; count: number }>;
};

export type CampaignAnalytics = {
  campaignId: string;
  name: string;
  totalParticipations: number;
  taskCompletionRate: Array<{
    taskId: string;
    title: string;
    completionRate: number;
    avgTimeToComplete: number | null;
  }>;
  platformDistribution: Array<{ platform: string; count: number }>;
  rewardStats: {
    claimed: number;
    redeemed: number;
    expired: number;
    rate: number;
  };
  dailyTrend: Array<{
    date: string;
    submissions: number;
    approvals: number;
    rejections: number;
  }>;
};

export type AIEffectiveness = {
  totalGenerations: number;
  byPlatform: Array<{ platform: string; count: number }>;
  byStyle: Array<{ style: string; count: number }>;
  avgContentLength: number;
  topTags: Array<{ tag: string; count: number }>;
};

export type AllianceStats = {
  totalPartners: number;
  totalCouponsIssued: number;
  totalCouponsRedeemed: number;
  redemptionRate: number;
  topPartners: Array<{ name: string; couponsIssued: number; redemptionRate: number }>;
  dailyTrend: Array<{ date: string; issued: number; redeemed: number }>;
};

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysAgo(days: number) {
  const date = startOfToday();
  date.setDate(date.getDate() - days);
  return date;
}

function toNumber(value: NumericValue) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return value.toNumber();
}

function rate(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Number((numerator / denominator).toFixed(4));
}

function round(value: NumericValue, digits = 2) {
  const numeric = toNumber(value);
  return Number(numeric.toFixed(digits));
}

export async function getPlatformOverview(): Promise<PlatformOverview> {
  const start = daysAgo(29);
  const end = startOfToday();

  const [
    totalCampaigns,
    activeCampaigns,
    totalParticipations,
    totalTasksCompleted,
    totalRewardsClaimed,
    totalRewardsRedeemed,
    statusCounts,
    dailyRows,
    topRows,
  ] = await Promise.all([
    prisma.campaign.count(),
    prisma.campaign.count({ where: { status: CampaignStatus.ACTIVE } }),
    prisma.participation.count(),
    prisma.taskSubmission.count({ where: { status: "APPROVED" } }),
    prisma.redemption.count(),
    prisma.redemption.count({ where: { status: "USED" } }),
    prisma.campaign.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.$queryRaw<
      Array<{
        date: string;
        participations: NumericValue;
        tasksCompleted: NumericValue;
        rewardsClaimed: NumericValue;
        rewardsRedeemed: NumericValue;
      }>
    >`
      WITH days AS (
        SELECT generate_series(
          date_trunc('day', CAST(${start} AS timestamp)),
          date_trunc('day', CAST(${end} AS timestamp)),
          interval '1 day'
        ) AS day
      ),
      participations AS (
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
        FROM "Participation"
        WHERE "createdAt" >= ${start}
        GROUP BY 1
      ),
      tasks_completed AS (
        SELECT date_trunc('day', COALESCE("reviewedAt", "updatedAt")) AS day, COUNT(*) AS count
        FROM "TaskSubmission"
        WHERE "status" = 'APPROVED'::"TaskStatus"
          AND COALESCE("reviewedAt", "updatedAt") >= ${start}
        GROUP BY 1
      ),
      rewards_claimed AS (
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
        FROM "Redemption"
        WHERE "createdAt" >= ${start}
        GROUP BY 1
      ),
      rewards_redeemed AS (
        SELECT date_trunc('day', "redeemedAt") AS day, COUNT(*) AS count
        FROM "Redemption"
        WHERE "status" = 'USED'::"ClaimStatus"
          AND "redeemedAt" >= ${start}
        GROUP BY 1
      )
      SELECT
        to_char(days.day, 'YYYY-MM-DD') AS date,
        COALESCE(participations.count, 0) AS participations,
        COALESCE(tasks_completed.count, 0) AS "tasksCompleted",
        COALESCE(rewards_claimed.count, 0) AS "rewardsClaimed",
        COALESCE(rewards_redeemed.count, 0) AS "rewardsRedeemed"
      FROM days
      LEFT JOIN participations ON participations.day = days.day
      LEFT JOIN tasks_completed ON tasks_completed.day = days.day
      LEFT JOIN rewards_claimed ON rewards_claimed.day = days.day
      LEFT JOIN rewards_redeemed ON rewards_redeemed.day = days.day
      ORDER BY days.day ASC
    `,
    prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        storeName: string;
        participations: NumericValue;
        taskCount: NumericValue;
        approvedSubmissions: NumericValue;
      }>
    >`
      WITH participation_counts AS (
        SELECT "campaignId", COUNT(*) AS participations
        FROM "Participation"
        GROUP BY "campaignId"
      ),
      task_counts AS (
        SELECT "campaignId", COUNT(*) AS "taskCount"
        FROM "CampaignTask"
        GROUP BY "campaignId"
      ),
      approved_counts AS (
        SELECT task."campaignId", COUNT(submission.id) AS "approvedSubmissions"
        FROM "TaskSubmission" submission
        INNER JOIN "CampaignTask" task ON task.id = submission."taskId"
        WHERE submission."status" = 'APPROVED'::"TaskStatus"
        GROUP BY task."campaignId"
      )
      SELECT
        campaign.id,
        campaign.title AS name,
        store.name AS "storeName",
        COALESCE(participation_counts.participations, 0) AS participations,
        COALESCE(task_counts."taskCount", 0) AS "taskCount",
        COALESCE(approved_counts."approvedSubmissions", 0) AS "approvedSubmissions"
      FROM "Campaign" campaign
      INNER JOIN "Store" store ON store.id = campaign."merchantId"
      LEFT JOIN participation_counts ON participation_counts."campaignId" = campaign.id
      LEFT JOIN task_counts ON task_counts."campaignId" = campaign.id
      LEFT JOIN approved_counts ON approved_counts."campaignId" = campaign.id
      ORDER BY participations DESC, "approvedSubmissions" DESC, campaign."createdAt" DESC
      LIMIT 5
    `,
  ]);

  const statusMap = new Map(statusCounts.map((item) => [item.status, item._count._all]));

  return {
    totalCampaigns,
    activeCampaigns,
    totalParticipations,
    totalTasksCompleted,
    totalRewardsClaimed,
    totalRewardsRedeemed,
    redemptionRate: rate(totalRewardsRedeemed, totalRewardsClaimed),
    avgTasksPerParticipation: rate(totalTasksCompleted, totalParticipations),
    topCampaigns: topRows.map((row) => {
      const participations = toNumber(row.participations);
      const taskCount = toNumber(row.taskCount);
      const approvedSubmissions = toNumber(row.approvedSubmissions);
      return {
        id: row.id,
        name: row.name,
        storeName: row.storeName,
        participations,
        completionRate: rate(approvedSubmissions, participations * taskCount),
      };
    }),
    dailyTrend: dailyRows.map((row) => ({
      date: row.date,
      participations: toNumber(row.participations),
      tasksCompleted: toNumber(row.tasksCompleted),
      rewardsClaimed: toNumber(row.rewardsClaimed),
      rewardsRedeemed: toNumber(row.rewardsRedeemed),
    })),
    campaignStatusDistribution: Object.values(CampaignStatus).map((status) => ({
      status,
      count: statusMap.get(status) ?? 0,
    })),
  };
}

export async function getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
  const start = daysAgo(29);
  const end = startOfToday();
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, title: true },
  });

  if (!campaign) {
    throw new HttpError("Campaign not found", 404);
  }

  const [
    totalParticipations,
    taskRows,
    platformRows,
    claimed,
    redeemed,
    expired,
    dailyRows,
  ] = await Promise.all([
    prisma.participation.count({ where: { campaignId } }),
    prisma.$queryRaw<
      Array<{
        taskId: string;
        title: string;
        approved: NumericValue;
        avgSeconds: NumericValue;
      }>
    >`
      SELECT
        task.id AS "taskId",
        task.title,
        COUNT(submission.id) AS approved,
        AVG(EXTRACT(EPOCH FROM (submission."submittedAt" - participation."createdAt"))) AS "avgSeconds"
      FROM "CampaignTask" task
      LEFT JOIN "TaskSubmission" submission
        ON submission."taskId" = task.id
        AND submission."status" = 'APPROVED'::"TaskStatus"
      LEFT JOIN "Participation" participation ON participation.id = submission."participationId"
      WHERE task."campaignId" = ${campaignId}
      GROUP BY task.id, task.title, task."sortOrder"
      ORDER BY task."sortOrder" ASC
    `,
    prisma.$queryRaw<Array<{ platform: string; count: NumericValue }>>`
      SELECT
        CASE task."taskType"::text
          WHEN 'DIANPING_REVIEW' THEN 'dianping'
          WHEN 'DOUYIN_POST' THEN 'douyin'
          WHEN 'XIAOHONGSHU_POST' THEN 'xiaohongshu'
          WHEN 'WECHAT_MOMENTS' THEN 'weixin_moments'
          ELSE 'unknown'
        END AS platform,
        COUNT(submission.id) AS count
      FROM "TaskSubmission" submission
      INNER JOIN "CampaignTask" task ON task.id = submission."taskId"
      WHERE task."campaignId" = ${campaignId}
        AND task."taskType"::text IN (
          'DIANPING_REVIEW',
          'DOUYIN_POST',
          'XIAOHONGSHU_POST',
          'WECHAT_MOMENTS'
        )
      GROUP BY platform
      ORDER BY count DESC
    `,
    prisma.redemption.count({ where: { reward: { campaignId } } }),
    prisma.redemption.count({ where: { reward: { campaignId }, status: "USED" } }),
    prisma.redemption.count({ where: { reward: { campaignId }, status: "EXPIRED" } }),
    prisma.$queryRaw<
      Array<{
        date: string;
        submissions: NumericValue;
        approvals: NumericValue;
        rejections: NumericValue;
      }>
    >`
      WITH days AS (
        SELECT generate_series(
          date_trunc('day', CAST(${start} AS timestamp)),
          date_trunc('day', CAST(${end} AS timestamp)),
          interval '1 day'
        ) AS day
      ),
      submissions AS (
        SELECT date_trunc('day', submission."submittedAt") AS day, COUNT(*) AS count
        FROM "TaskSubmission" submission
        INNER JOIN "CampaignTask" task ON task.id = submission."taskId"
        WHERE task."campaignId" = ${campaignId}
          AND submission."submittedAt" >= ${start}
        GROUP BY 1
      ),
      approvals AS (
        SELECT date_trunc('day', COALESCE(submission."reviewedAt", submission."updatedAt")) AS day, COUNT(*) AS count
        FROM "TaskSubmission" submission
        INNER JOIN "CampaignTask" task ON task.id = submission."taskId"
        WHERE task."campaignId" = ${campaignId}
          AND submission."status" = 'APPROVED'::"TaskStatus"
          AND COALESCE(submission."reviewedAt", submission."updatedAt") >= ${start}
        GROUP BY 1
      ),
      rejections AS (
        SELECT date_trunc('day', COALESCE(submission."reviewedAt", submission."updatedAt")) AS day, COUNT(*) AS count
        FROM "TaskSubmission" submission
        INNER JOIN "CampaignTask" task ON task.id = submission."taskId"
        WHERE task."campaignId" = ${campaignId}
          AND submission."status" = 'REJECTED'::"TaskStatus"
          AND COALESCE(submission."reviewedAt", submission."updatedAt") >= ${start}
        GROUP BY 1
      )
      SELECT
        to_char(days.day, 'YYYY-MM-DD') AS date,
        COALESCE(submissions.count, 0) AS submissions,
        COALESCE(approvals.count, 0) AS approvals,
        COALESCE(rejections.count, 0) AS rejections
      FROM days
      LEFT JOIN submissions ON submissions.day = days.day
      LEFT JOIN approvals ON approvals.day = days.day
      LEFT JOIN rejections ON rejections.day = days.day
      ORDER BY days.day ASC
    `,
  ]);

  return {
    campaignId: campaign.id,
    name: campaign.title,
    totalParticipations,
    taskCompletionRate: taskRows.map((row) => ({
      taskId: row.taskId,
      title: row.title,
      completionRate: rate(toNumber(row.approved), totalParticipations),
      avgTimeToComplete: row.avgSeconds === null ? null : round(row.avgSeconds, 0),
    })),
    platformDistribution: platformRows.map((row) => ({
      platform: row.platform,
      count: toNumber(row.count),
    })),
    rewardStats: {
      claimed,
      redeemed,
      expired,
      rate: rate(redeemed, claimed),
    },
    dailyTrend: dailyRows.map((row) => ({
      date: row.date,
      submissions: toNumber(row.submissions),
      approvals: toNumber(row.approvals),
      rejections: toNumber(row.rejections),
    })),
  };
}

export async function getAIEffectiveness(): Promise<AIEffectiveness> {
  const [totalGenerations, platformRows, styleRows, lengthRows, tagRows] = await Promise.all([
    prisma.event.count({ where: { eventType: "ai_generate" } }),
    prisma.$queryRaw<Array<{ platform: string; count: NumericValue }>>`
      SELECT COALESCE("metadata"->>'platform', 'unknown') AS platform, COUNT(*) AS count
      FROM "Event"
      WHERE "eventType" = 'ai_generate'::"EventType"
      GROUP BY platform
      ORDER BY count DESC
    `,
    prisma.$queryRaw<Array<{ style: string; count: NumericValue }>>`
      SELECT COALESCE("metadata"->>'style', 'unknown') AS style, COUNT(*) AS count
      FROM "Event"
      WHERE "eventType" = 'ai_generate'::"EventType"
      GROUP BY style
      ORDER BY count DESC
    `,
    prisma.$queryRaw<Array<{ avgLength: NumericValue }>>`
      SELECT AVG(
        CASE
          WHEN ("metadata"->>'contentLength') ~ '^[0-9]+$'
            THEN ("metadata"->>'contentLength')::int
          ELSE NULL
        END
      ) AS "avgLength"
      FROM "Event"
      WHERE "eventType" = 'ai_generate'::"EventType"
    `,
    prisma.$queryRaw<Array<{ tag: string; count: NumericValue }>>`
      SELECT tag, COUNT(*) AS count
      FROM "Event",
      LATERAL jsonb_array_elements_text(
        CASE
          WHEN jsonb_typeof("metadata"->'tags') = 'array' THEN "metadata"->'tags'
          ELSE '[]'::jsonb
        END
      ) AS tag
      WHERE "eventType" = 'ai_generate'::"EventType"
      GROUP BY tag
      ORDER BY count DESC, tag ASC
      LIMIT 10
    `,
  ]);

  return {
    totalGenerations,
    byPlatform: platformRows.map((row) => ({
      platform: row.platform,
      count: toNumber(row.count),
    })),
    byStyle: styleRows.map((row) => ({
      style: row.style,
      count: toNumber(row.count),
    })),
    avgContentLength: round(lengthRows[0]?.avgLength ?? 0, 0),
    topTags: tagRows.map((row) => ({
      tag: row.tag,
      count: toNumber(row.count),
    })),
  };
}

export async function getAllianceStats(): Promise<AllianceStats> {
  const start = daysAgo(29);
  const end = startOfToday();
  const [totalPartners, totalCouponsIssued, totalCouponsRedeemed, topRows, dailyRows] =
    await Promise.all([
      prisma.alliancePartner.count(),
      prisma.couponClaim.count(),
      prisma.couponClaim.count({ where: { status: "USED" } }),
      prisma.$queryRaw<
        Array<{
          name: string;
          couponsIssued: NumericValue;
          couponsRedeemed: NumericValue;
        }>
      >`
        SELECT
          partner.name,
          COUNT(claim.id) AS "couponsIssued",
          COUNT(claim.id) FILTER (WHERE claim."status" = 'USED'::"ClaimStatus") AS "couponsRedeemed"
        FROM "AlliancePartner" partner
        LEFT JOIN "AllianceCoupon" coupon ON coupon."partnerId" = partner.id
        LEFT JOIN "CouponClaim" claim ON claim."couponId" = coupon.id
        GROUP BY partner.id, partner.name
        ORDER BY "couponsIssued" DESC, "couponsRedeemed" DESC, partner."createdAt" DESC
        LIMIT 5
      `,
      prisma.$queryRaw<
        Array<{
          date: string;
          issued: NumericValue;
          redeemed: NumericValue;
        }>
      >`
        WITH days AS (
          SELECT generate_series(
            date_trunc('day', CAST(${start} AS timestamp)),
            date_trunc('day', CAST(${end} AS timestamp)),
            interval '1 day'
          ) AS day
        ),
        issued AS (
          SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
          FROM "CouponClaim"
          WHERE "createdAt" >= ${start}
          GROUP BY 1
        ),
        redeemed AS (
          SELECT date_trunc('day', "usedAt") AS day, COUNT(*) AS count
          FROM "CouponClaim"
          WHERE "status" = 'USED'::"ClaimStatus"
            AND "usedAt" >= ${start}
          GROUP BY 1
        )
        SELECT
          to_char(days.day, 'YYYY-MM-DD') AS date,
          COALESCE(issued.count, 0) AS issued,
          COALESCE(redeemed.count, 0) AS redeemed
        FROM days
        LEFT JOIN issued ON issued.day = days.day
        LEFT JOIN redeemed ON redeemed.day = days.day
        ORDER BY days.day ASC
      `,
    ]);

  return {
    totalPartners,
    totalCouponsIssued,
    totalCouponsRedeemed,
    redemptionRate: rate(totalCouponsRedeemed, totalCouponsIssued),
    topPartners: topRows.map((row) => {
      const couponsIssued = toNumber(row.couponsIssued);
      const couponsRedeemed = toNumber(row.couponsRedeemed);
      return {
        name: row.name,
        couponsIssued,
        redemptionRate: rate(couponsRedeemed, couponsIssued),
      };
    }),
    dailyTrend: dailyRows.map((row) => ({
      date: row.date,
      issued: toNumber(row.issued),
      redeemed: toNumber(row.redeemed),
    })),
  };
}
