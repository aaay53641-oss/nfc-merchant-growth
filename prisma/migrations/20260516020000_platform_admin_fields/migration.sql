ALTER TABLE "Merchant"
ADD COLUMN "businessLicense" TEXT,
ADD COLUMN "legalPerson" TEXT,
ADD COLUMN "reviewNote" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedBy" TEXT;

ALTER TABLE "Store"
ADD COLUMN "status" "Status" NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX "Store_status_idx" ON "Store"("status");
