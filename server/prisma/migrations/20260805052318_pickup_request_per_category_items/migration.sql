-- AlterTable
ALTER TABLE "PickupRequest" DROP COLUMN "categories",
DROP COLUMN "loadSize";

-- CreateTable
CREATE TABLE "PickupRequestItem" (
    "id" TEXT NOT NULL,
    "pickupRequestId" TEXT NOT NULL,
    "category" "WasteCategory" NOT NULL,
    "loadSize" "LoadSize" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickupRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PickupRequestItem_pickupRequestId_idx" ON "PickupRequestItem"("pickupRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "PickupRequestItem_pickupRequestId_category_key" ON "PickupRequestItem"("pickupRequestId", "category");

-- AddForeignKey
ALTER TABLE "PickupRequestItem" ADD CONSTRAINT "PickupRequestItem_pickupRequestId_fkey" FOREIGN KEY ("pickupRequestId") REFERENCES "PickupRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

