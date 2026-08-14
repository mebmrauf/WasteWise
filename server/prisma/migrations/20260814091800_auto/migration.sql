-- CreateEnum
CREATE TYPE "BulkRequestStatus" AS ENUM ('OPEN_FOR_BIDDING', 'RECYCLING_COMPANY_ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'VERIFYING_WEIGHTS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "PickupRequest" ADD COLUMN     "isBulk" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Rating" ADD COLUMN     "bulkRequestId" TEXT,
ALTER COLUMN "pickupRequestId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RecyclingCompanyProfile" ADD COLUMN     "acceptedWasteMaterials" "WasteCategory"[],
ADD COLUMN     "serviceAreas" TEXT[],
ADD COLUMN     "tradeLicenseNumber" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "isPhoneVerified",
ADD COLUMN     "lastTreePlantationClaimDate" TIMESTAMP(3),
ADD COLUMN     "nextTreePlantationEligibleDate" TIMESTAMP(3),
ADD COLUMN     "sustainabilityCertificateUrl" TEXT,
ADD COLUMN     "treePlantationClaimed" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "email" SET NOT NULL;

-- CreateTable
CREATE TABLE "BulkMarketplaceRequest" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "assignedCompanyId" TEXT,
    "wasteTypes" JSONB NOT NULL,
    "estimatedWeightKg" DOUBLE PRECISION NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "placeId" TEXT,
    "preferredPickupDate" TIMESTAMP(3) NOT NULL,
    "images" TEXT[],
    "additionalNotes" TEXT,
    "status" "BulkRequestStatus" NOT NULL DEFAULT 'OPEN_FOR_BIDDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "collectionPhotos" TEXT[],
    "verifiedTotalWeightKg" DOUBLE PRECISION,
    "verifiedWeights" JSONB,

    CONSTRAINT "BulkMarketplaceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceQuotation" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "purchasePrice" DOUBLE PRECISION NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "estimatedPickupDate" TIMESTAMP(3) NOT NULL,
    "estimatedPickupTime" TEXT,
    "additionalNotes" TEXT,
    "status" "QuotationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pricesPerKg" JSONB,

    CONSTRAINT "MarketplaceQuotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BulkMarketplaceRequest_businessId_idx" ON "BulkMarketplaceRequest"("businessId");

-- CreateIndex
CREATE INDEX "BulkMarketplaceRequest_status_idx" ON "BulkMarketplaceRequest"("status");

-- CreateIndex
CREATE INDEX "MarketplaceQuotation_companyId_idx" ON "MarketplaceQuotation"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceQuotation_requestId_companyId_key" ON "MarketplaceQuotation"("requestId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_bulkRequestId_key" ON "Rating"("bulkRequestId");

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_bulkRequestId_fkey" FOREIGN KEY ("bulkRequestId") REFERENCES "BulkMarketplaceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkMarketplaceRequest" ADD CONSTRAINT "BulkMarketplaceRequest_assignedCompanyId_fkey" FOREIGN KEY ("assignedCompanyId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkMarketplaceRequest" ADD CONSTRAINT "BulkMarketplaceRequest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceQuotation" ADD CONSTRAINT "MarketplaceQuotation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceQuotation" ADD CONSTRAINT "MarketplaceQuotation_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BulkMarketplaceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

