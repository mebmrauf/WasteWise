-- CreateEnum
CREATE TYPE "MembershipLevel" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "PlatinumGift" AS ENUM ('TREE_SAPLING', 'ECO_TOTE_BAG', 'REUSABLE_WATER_BOTTLE');

-- CreateEnum
CREATE TYPE "TransactionCategory" AS ENUM ('PICKUP', 'BONUS', 'REFERRAL', 'LOYALTY', 'REDEMPTION', 'OTHER');

-- AlterEnum
ALTER TYPE "PickupStatus" ADD VALUE 'VERIFYING_WEIGHTS';

-- AlterEnum
ALTER TYPE "WasteCategory" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "CollectorProfile" ADD COLUMN     "vehicleNumber" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "licenseNumber" SET NOT NULL,
ALTER COLUMN "licenseNumber" SET DEFAULT '',
ALTER COLUMN "serviceArea" SET NOT NULL,
ALTER COLUMN "serviceArea" SET DEFAULT '';

-- AlterTable
ALTER TABLE "GreenPointsTransaction" ADD COLUMN     "basePoints" INTEGER,
ADD COLUMN     "bonusPoints" INTEGER,
ADD COLUMN     "category" "TransactionCategory" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "rewardReason" JSONB,
ADD COLUMN     "totalPoints" INTEGER;

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "bidAmountsPerKg" JSONB;

-- AlterTable
ALTER TABLE "PickupRequest" ADD COLUMN     "isExclusiveToPreferred" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preferredCollectorId" TEXT,
ADD COLUMN     "serviceArea" TEXT;

-- AlterTable
ALTER TABLE "PickupRequestItem" ADD COLUMN     "exactWeightKg" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "discountCouponClaimed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "giftClaimDate" TIMESTAMP(3),
ADD COLUMN     "giftClaimed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastDiscountClaimDate" TIMESTAMP(3),
ADD COLUMN     "membershipBadge" TEXT NOT NULL DEFAULT 'Bronze Badge',
ADD COLUMN     "membershipLevel" "MembershipLevel" NOT NULL DEFAULT 'BRONZE',
ADD COLUMN     "milestonesClaimed" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "nextDiscountEligibleDate" TIMESTAMP(3),
ADD COLUMN     "nextGiftEligibleDate" TIMESTAMP(3),
ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referralPointsEarned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "referralRewardClaimed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referredById" TEXT,
ADD COLUMN     "selectedGift" "PlatinumGift",
ADD COLUMN     "successfulReferrals" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalGreenPoints" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "phone" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

