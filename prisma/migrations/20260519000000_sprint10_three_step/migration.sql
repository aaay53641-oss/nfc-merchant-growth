CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');
CREATE TYPE "VerificationMethod" AS ENUM ('STAFF_CONFIRM', 'LINK', 'SCREENSHOT');
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "LotteryStatus" AS ENUM ('PENDING', 'WON', 'LOST', 'CANCELLED');

ALTER TABLE "Campaign"
ADD COLUMN "lotteryDailyQuota" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "lotteryDrawTime" TEXT,
ADD COLUMN "lotteryMinScore" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN "lotteryActive" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "CampaignMedia" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "mediaType" "MediaType" NOT NULL DEFAULT 'IMAGE',
  "category" TEXT,
  "platform" TEXT,
  "dishName" TEXT,
  "title" TEXT,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "description" TEXT,
  "allowUserUse" BOOLEAN NOT NULL DEFAULT true,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "step2Enabled" BOOLEAN NOT NULL DEFAULT false,
  "step3Enabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignMedia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParticipationVerification" (
  "id" TEXT NOT NULL,
  "participationId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "submissionId" TEXT,
  "method" "VerificationMethod" NOT NULL,
  "platform" TEXT,
  "link" TEXT,
  "screenshotUrl" TEXT,
  "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
  "verifiedAt" TIMESTAMP(3),
  "verifiedBy" TEXT,
  "reviewNote" TEXT,
  "qualityScore" INTEGER,
  "qualityBreakdown" JSONB,
  "lotteryChances" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ParticipationVerification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LotteryEntry" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "participationId" TEXT NOT NULL,
  "weight" INTEGER NOT NULL DEFAULT 1,
  "status" "LotteryStatus" NOT NULL DEFAULT 'PENDING',
  "drawnAt" TIMESTAMP(3),
  "redemptionId" TEXT,
  "qualityScore" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LotteryEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParticipationVerification_participationId_taskId_key" ON "ParticipationVerification"("participationId", "taskId");
CREATE UNIQUE INDEX "LotteryEntry_campaignId_participationId_key" ON "LotteryEntry"("campaignId", "participationId");

CREATE INDEX "CampaignMedia_campaignId_idx" ON "CampaignMedia"("campaignId");
CREATE INDEX "CampaignMedia_mediaType_idx" ON "CampaignMedia"("mediaType");
CREATE INDEX "CampaignMedia_platform_idx" ON "CampaignMedia"("platform");
CREATE INDEX "CampaignMedia_enabled_idx" ON "CampaignMedia"("enabled");
CREATE INDEX "CampaignMedia_step2Enabled_idx" ON "CampaignMedia"("step2Enabled");
CREATE INDEX "CampaignMedia_step3Enabled_idx" ON "CampaignMedia"("step3Enabled");
CREATE INDEX "ParticipationVerification_taskId_idx" ON "ParticipationVerification"("taskId");
CREATE INDEX "ParticipationVerification_submissionId_idx" ON "ParticipationVerification"("submissionId");
CREATE INDEX "ParticipationVerification_status_idx" ON "ParticipationVerification"("status");
CREATE INDEX "ParticipationVerification_method_idx" ON "ParticipationVerification"("method");
CREATE INDEX "LotteryEntry_campaignId_idx" ON "LotteryEntry"("campaignId");
CREATE INDEX "LotteryEntry_participationId_idx" ON "LotteryEntry"("participationId");
CREATE INDEX "LotteryEntry_status_idx" ON "LotteryEntry"("status");

ALTER TABLE "CampaignMedia" ADD CONSTRAINT "CampaignMedia_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParticipationVerification" ADD CONSTRAINT "ParticipationVerification_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "Participation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParticipationVerification" ADD CONSTRAINT "ParticipationVerification_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "CampaignTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParticipationVerification" ADD CONSTRAINT "ParticipationVerification_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "TaskSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LotteryEntry" ADD CONSTRAINT "LotteryEntry_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LotteryEntry" ADD CONSTRAINT "LotteryEntry_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "Participation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LotteryEntry" ADD CONSTRAINT "LotteryEntry_redemptionId_fkey" FOREIGN KEY ("redemptionId") REFERENCES "Redemption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
