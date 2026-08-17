-- CreateEnum
CREATE TYPE "RoutePlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RouteStopStatus" AS ENUM ('QUEUED', 'VISITED', 'SKIPPED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ROUTE_UPDATE';

-- CreateTable
CREATE TABLE "RoutePlan" (
    "id" TEXT NOT NULL,
    "collectorId" TEXT NOT NULL,
    "status" "RoutePlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "originLatitude" DOUBLE PRECISION NOT NULL,
    "originLongitude" DOUBLE PRECISION NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteStop" (
    "id" TEXT NOT NULL,
    "routePlanId" TEXT NOT NULL,
    "pickupRequestId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" "RouteStopStatus" NOT NULL DEFAULT 'QUEUED',
    "visitedAt" TIMESTAMP(3),
    "skippedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteStop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoutePlan_collectorId_status_idx" ON "RoutePlan"("collectorId", "status");

-- CreateIndex
CREATE INDEX "RouteStop_routePlanId_sequence_idx" ON "RouteStop"("routePlanId", "sequence");

-- CreateIndex
CREATE INDEX "RouteStop_pickupRequestId_idx" ON "RouteStop"("pickupRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "RouteStop_routePlanId_pickupRequestId_key" ON "RouteStop"("routePlanId", "pickupRequestId");

-- AddForeignKey
ALTER TABLE "RoutePlan" ADD CONSTRAINT "RoutePlan_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_routePlanId_fkey" FOREIGN KEY ("routePlanId") REFERENCES "RoutePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_pickupRequestId_fkey" FOREIGN KEY ("pickupRequestId") REFERENCES "PickupRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
