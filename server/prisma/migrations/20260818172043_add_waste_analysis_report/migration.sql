-- CreateEnum
CREATE TYPE "WasteAnalysisReviewStatus" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED');

-- AlterTable
ALTER TABLE "PickupRequest" ADD COLUMN     "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "wasteDescription" TEXT;

-- CreateTable
CREATE TABLE "WasteAnalysisReport" (
    "id" TEXT NOT NULL,
    "pickupRequestId" TEXT,
    "bulkRequestId" TEXT,
    "requesterId" TEXT NOT NULL,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "visionLabels" JSONB,
    "detectedCondition" TEXT,
    "estimatedUsagePeriod" TEXT,
    "suggestedCategory" "WasteCategory",
    "confidence" DOUBLE PRECISION,
    "aiSummary" TEXT,
    "reviewReason" TEXT,
    "reviewStatus" "WasteAnalysisReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewedByAdminId" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WasteAnalysisReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WasteAnalysisReport_reviewStatus_idx" ON "WasteAnalysisReport"("reviewStatus");

-- CreateIndex
CREATE INDEX "WasteAnalysisReport_pickupRequestId_idx" ON "WasteAnalysisReport"("pickupRequestId");

-- CreateIndex
CREATE INDEX "WasteAnalysisReport_bulkRequestId_idx" ON "WasteAnalysisReport"("bulkRequestId");

-- AddForeignKey
ALTER TABLE "WasteAnalysisReport" ADD CONSTRAINT "WasteAnalysisReport_pickupRequestId_fkey" FOREIGN KEY ("pickupRequestId") REFERENCES "PickupRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteAnalysisReport" ADD CONSTRAINT "WasteAnalysisReport_bulkRequestId_fkey" FOREIGN KEY ("bulkRequestId") REFERENCES "BulkMarketplaceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteAnalysisReport" ADD CONSTRAINT "WasteAnalysisReport_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteAnalysisReport" ADD CONSTRAINT "WasteAnalysisReport_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
