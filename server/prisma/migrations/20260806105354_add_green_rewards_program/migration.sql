-- CreateEnum
CREATE TYPE "GreenPointsTransactionType" AS ENUM ('EARNED', 'REDEEMED');

-- CreateEnum
CREATE TYPE "MobileOperator" AS ENUM ('GRAMEENPHONE', 'BANGLALINK', 'ROBI', 'AIRTEL', 'TELETALK');

-- CreateEnum
CREATE TYPE "SimType" AS ENUM ('PREPAID', 'POSTPAID');

-- CreateEnum
CREATE TYPE "MobileRechargeStatus" AS ENUM ('SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "greenPointsBalance" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "GreenPointsTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pickupRequestId" TEXT,
    "points" INTEGER NOT NULL,
    "type" "GreenPointsTransactionType" NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GreenPointsTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileRechargeTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "operator" "MobileOperator" NOT NULL,
    "simType" "SimType" NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "amountTaka" INTEGER NOT NULL,
    "pointsSpent" INTEGER NOT NULL,
    "status" "MobileRechargeStatus" NOT NULL,
    "greenPointsTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileRechargeTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GreenPointsTransaction_userId_idx" ON "GreenPointsTransaction"("userId");

-- CreateIndex
CREATE INDEX "GreenPointsTransaction_userId_createdAt_idx" ON "GreenPointsTransaction"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MobileRechargeTransaction_greenPointsTransactionId_key" ON "MobileRechargeTransaction"("greenPointsTransactionId");

-- CreateIndex
CREATE INDEX "MobileRechargeTransaction_userId_createdAt_idx" ON "MobileRechargeTransaction"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "GreenPointsTransaction" ADD CONSTRAINT "GreenPointsTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GreenPointsTransaction" ADD CONSTRAINT "GreenPointsTransaction_pickupRequestId_fkey" FOREIGN KEY ("pickupRequestId") REFERENCES "PickupRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileRechargeTransaction" ADD CONSTRAINT "MobileRechargeTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileRechargeTransaction" ADD CONSTRAINT "MobileRechargeTransaction_greenPointsTransactionId_fkey" FOREIGN KEY ("greenPointsTransactionId") REFERENCES "GreenPointsTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
