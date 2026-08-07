-- CreateTable
-- (Created before the AlterEnum block below because that block also updates
-- this table's "status" column to the new PickupStatus enum; the table must
-- exist first.)
CREATE TABLE "PickupTrackingEvent" (
    "id" TEXT NOT NULL,
    "pickupRequestId" TEXT NOT NULL,
    "status" "PickupStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickupTrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PickupTrackingEvent_pickupRequestId_idx" ON "PickupTrackingEvent"("pickupRequestId");

-- AddForeignKey
ALTER TABLE "PickupTrackingEvent" ADD CONSTRAINT "PickupTrackingEvent_pickupRequestId_fkey" FOREIGN KEY ("pickupRequestId") REFERENCES "PickupRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterEnum
-- Replaces IN_PROGRESS (which covered both "collector en route" and
-- "pickup underway") with two more granular statuses, EN_ROUTE and ARRIVED,
-- for Real-Time Pickup Tracking. Confirmed zero PickupRequest rows exist in
-- this database at migration time (table was empty), so this is not a
-- destructive change against real data.
BEGIN;
CREATE TYPE "PickupStatus_new" AS ENUM ('PENDING', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED', 'CANCELLED');
ALTER TABLE "PickupRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PickupRequest" ALTER COLUMN "status" TYPE "PickupStatus_new" USING ("status"::text::"PickupStatus_new");
ALTER TABLE "PickupTrackingEvent" ALTER COLUMN "status" TYPE "PickupStatus_new" USING ("status"::text::"PickupStatus_new");
ALTER TYPE "PickupStatus" RENAME TO "PickupStatus_old";
ALTER TYPE "PickupStatus_new" RENAME TO "PickupStatus";
DROP TYPE "PickupStatus_old";
ALTER TABLE "PickupRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;
