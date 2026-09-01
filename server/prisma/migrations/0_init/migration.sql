-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'COLLECTOR', 'RECYCLING_COMPANY', 'ADMIN');

-- CreateEnum
CREATE TYPE "MembershipLevel" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "PlatinumGift" AS ENUM ('TREE_SAPLING', 'ECO_TOTE_BAG', 'REUSABLE_WATER_BOTTLE');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('HOUSEHOLD', 'BUSINESS');

-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('HANDCART', 'BICYCLE_VAN', 'MOTORCYCLE_VAN', 'PICKUP_TRUCK', 'TRUCK');

-- CreateEnum
CREATE TYPE "RoutePlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RouteStopStatus" AS ENUM ('QUEUED', 'VISITED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "WasteCategory" AS ENUM ('PLASTIC', 'PAPER', 'ORGANIC', 'GLASS', 'METAL', 'ELECTRONIC', 'OTHER');

-- CreateEnum
CREATE TYPE "LoadSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE');

-- CreateEnum
CREATE TYPE "PickupStatus" AS ENUM ('PENDING', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED', 'CANCELLED', 'VERIFYING_WEIGHTS');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "BulkRequestStatus" AS ENUM ('OPEN_FOR_BIDDING', 'BIDDING_CLOSED', 'RECYCLING_COMPANY_ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'VERIFYING_WEIGHTS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WasteAnalysisReviewStatus" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "WasteItemCondition" AS ENUM ('NEW', 'LIGHTLY_USED', 'MODERATELY_USED', 'HEAVILY_USED', 'DAMAGED', 'BROKEN', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "WasteUsagePeriod" AS ENUM ('UNDER_6_MONTHS', 'SIX_MONTHS_TO_1_YEAR', 'ONE_TO_3_YEARS', 'THREE_TO_5_YEARS', 'OVER_5_YEARS', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PICKUP_STATUS_UPDATE', 'OFFER_RECEIVED', 'REMINDER', 'VERIFICATION_UPDATE', 'COMPLAINT_UPDATE', 'ROUTE_UPDATE', 'GENERIC', 'CAMPAIGN_UPDATE');

-- CreateEnum
CREATE TYPE "GreenPointsTransactionType" AS ENUM ('EARNED', 'REDEEMED');

-- CreateEnum
CREATE TYPE "TransactionCategory" AS ENUM ('PICKUP', 'BONUS', 'REFERRAL', 'LOYALTY', 'REDEMPTION', 'CSR_CONTRIBUTION', 'OTHER');

-- CreateEnum
CREATE TYPE "MobileOperator" AS ENUM ('GRAMEENPHONE', 'BANGLALINK', 'ROBI', 'AIRTEL', 'TELETALK');

-- CreateEnum
CREATE TYPE "SimType" AS ENUM ('PREPAID', 'POSTPAID');

-- CreateEnum
CREATE TYPE "MobileRechargeStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'MOBILE_BANKING', 'SSLCOMMERZ', 'COD', 'NOT_SELECTED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CsrStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CampaignRegistrationType" AS ENUM ('ATTENDEE', 'VOLUNTEER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "telephone" TEXT,
    "passwordHash" TEXT,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountType" "AccountType",
    "avatarUrl" TEXT,
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "formattedAddress" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "placeId" TEXT,
    "greenPointsBalance" INTEGER NOT NULL DEFAULT 0,
    "discountCouponClaimed" BOOLEAN NOT NULL DEFAULT false,
    "giftClaimDate" TIMESTAMP(3),
    "giftClaimed" BOOLEAN NOT NULL DEFAULT false,
    "lastDiscountClaimDate" TIMESTAMP(3),
    "membershipBadge" TEXT NOT NULL DEFAULT 'Bronze Badge',
    "membershipLevel" "MembershipLevel" NOT NULL DEFAULT 'BRONZE',
    "milestonesClaimed" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "nextDiscountEligibleDate" TIMESTAMP(3),
    "nextGiftEligibleDate" TIMESTAMP(3),
    "referralCode" TEXT,
    "referralPointsEarned" INTEGER NOT NULL DEFAULT 0,
    "referralRewardClaimed" BOOLEAN NOT NULL DEFAULT false,
    "referredById" TEXT,
    "selectedGift" "PlatinumGift",
    "successfulReferrals" INTEGER NOT NULL DEFAULT 0,
    "totalGreenPoints" INTEGER NOT NULL DEFAULT 0,
    "lastTreePlantationClaimDate" TIMESTAMP(3),
    "nextTreePlantationEligibleDate" TIMESTAMP(3),
    "sustainabilityCertificateUrl" TEXT,
    "treePlantationClaimed" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationReminderSentAt" TIMESTAMP(3),
    "rewardsEmailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "communityName" TEXT,
    "hasJoinedCampaignCommunity" BOOLEAN NOT NULL DEFAULT false,
    "campaignCommunityJoinedAt" TIMESTAMP(3),
    "campaignNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAccount" (
    "id" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailVerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedByTokenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "vehicleNumber" TEXT NOT NULL DEFAULT '',
    "licenseNumber" TEXT NOT NULL DEFAULT '',
    "serviceArea" TEXT NOT NULL DEFAULT '',
    "serviceAreaPlaceId" TEXT,
    "serviceAreaFormattedAddress" TEXT,
    "serviceAreaLatitude" DOUBLE PRECISION,
    "serviceAreaLongitude" DOUBLE PRECISION,
    "serviceAreaRadiusKm" DOUBLE PRECISION,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verificationDocumentUrl" TEXT,
    "verificationReviewedAt" TIMESTAMP(3),
    "verificationReviewedByAdminId" TEXT,
    "verificationRejectionReason" TEXT,
    "averageRating" DOUBLE PRECISION,
    "totalRatings" INTEGER NOT NULL DEFAULT 0,
    "lastKnownLatitude" DOUBLE PRECISION,
    "lastKnownLongitude" DOUBLE PRECISION,
    "lastLocationUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecyclingCompanyProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "currentInventoryKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verificationDocumentUrl" TEXT,
    "verificationReviewedAt" TIMESTAMP(3),
    "verificationReviewedByAdminId" TEXT,
    "verificationRejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "acceptedWasteMaterials" "WasteCategory"[],
    "serviceAreas" TEXT[],
    "tradeLicenseNumber" TEXT,

    CONSTRAINT "RecyclingCompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "tradeLicenseNumber" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verificationDocumentUrl" TEXT,
    "verificationReviewedAt" TIMESTAMP(3),
    "verificationReviewedByAdminId" TEXT,
    "verificationRejectionReason" TEXT,
    "askForCsrContribution" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickupRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "assignedCollectorId" TEXT,
    "timeSlotStart" TIMESTAMP(3) NOT NULL,
    "timeSlotEnd" TIMESTAMP(3),
    "status" "PickupStatus" NOT NULL DEFAULT 'PENDING',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pickupFormattedAddress" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "isExclusiveToPreferred" BOOLEAN NOT NULL DEFAULT false,
    "preferredCollectorId" TEXT,
    "serviceArea" TEXT,
    "isBulk" BOOLEAN NOT NULL DEFAULT false,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "wasteDescription" TEXT,

    CONSTRAINT "PickupRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickupRequestItem" (
    "id" TEXT NOT NULL,
    "pickupRequestId" TEXT NOT NULL,
    "category" "WasteCategory" NOT NULL,
    "loadSize" "LoadSize" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "exactWeightKg" DOUBLE PRECISION,

    CONSTRAINT "PickupRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "pickupRequestId" TEXT NOT NULL,
    "collectorId" TEXT NOT NULL,
    "bidAmount" DOUBLE PRECISION NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "message" TEXT,
    "bidAmountsPerKg" JSONB,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickupTrackingEvent" (
    "id" TEXT NOT NULL,
    "pickupRequestId" TEXT NOT NULL,
    "status" "PickupStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickupTrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeightRecord" (
    "id" TEXT NOT NULL,
    "pickupRequestId" TEXT NOT NULL,
    "estimatedMinKg" DOUBLE PRECISION NOT NULL,
    "estimatedMaxKg" DOUBLE PRECISION NOT NULL,
    "exactWeightKg" DOUBLE PRECISION,
    "loggedAt" TIMESTAMP(3),
    "loggedByCollectorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeightRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "pickupRequestId" TEXT,
    "raterId" TEXT NOT NULL,
    "collectorId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bulkRequestId" TEXT,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "pickupRequestId" TEXT,
    "bulkRequestId" TEXT,
    "complainantId" TEXT NOT NULL,
    "againstUserId" TEXT,
    "description" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "resolutionNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByAdminId" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "relatedPickupRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WasteRecognitionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "detectedCategory" "WasteCategory" NOT NULL,
    "isRecyclable" BOOLEAN NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "rawLabels" JSONB NOT NULL,
    "preparationTip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WasteRecognitionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WasteAnalysisReport" (
    "id" TEXT NOT NULL,
    "pickupRequestId" TEXT,
    "bulkRequestId" TEXT,
    "requesterId" TEXT NOT NULL,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "visionLabels" JSONB,
    "detectedCondition" "WasteItemCondition",
    "estimatedUsagePeriod" "WasteUsagePeriod",
    "suggestedCategory" "WasteCategory",
    "confidence" DOUBLE PRECISION,
    "aiSummary" TEXT,
    "needsAdminReview" BOOLEAN NOT NULL DEFAULT true,
    "reviewReason" TEXT,
    "reviewStatus" "WasteAnalysisReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewedByAdminId" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WasteAnalysisReport_pkey" PRIMARY KEY ("id")
);

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
    "basePoints" INTEGER,
    "bonusPoints" INTEGER,
    "category" "TransactionCategory" NOT NULL DEFAULT 'OTHER',
    "rewardReason" JSONB,
    "totalPoints" INTEGER,

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
    "bidEndsAt" TIMESTAMP(3),
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
    "isHighestBid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pricesPerKg" JSONB,

    CONSTRAINT "MarketplaceQuotation_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "CsrContribution" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "pickupId" TEXT NOT NULL,
    "donationAmount" DOUBLE PRECISION NOT NULL,
    "donationPercentage" DOUBLE PRECISION,
    "selectedCause" TEXT NOT NULL,
    "paymentAmount" DOUBLE PRECISION NOT NULL,
    "status" "CsrStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CsrContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "pickupId" TEXT,
    "bulkRequestId" TEXT,
    "customerId" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecyclingCampaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "volunteersNeeded" INTEGER,
    "coverImageUrl" TEXT,
    "createdByAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecyclingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignRegistration" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CampaignRegistrationType" NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignVideo" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "videoUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "uploadedByAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_IgnoredPickups" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_telephone_key" ON "User"("telephone");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "OAuthAccount_userId_idx" ON "OAuthAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAccount_provider_providerAccountId_key" ON "OAuthAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAccount_userId_provider_key" ON "OAuthAccount"("userId", "provider");

-- CreateIndex
CREATE INDEX "EmailVerificationCode_userId_idx" ON "EmailVerificationCode"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetCode_userId_idx" ON "PasswordResetCode"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectorProfile_userId_key" ON "CollectorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RecyclingCompanyProfile_userId_key" ON "RecyclingCompanyProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessProfile_userId_key" ON "BusinessProfile"("userId");

-- CreateIndex
CREATE INDEX "PickupRequest_status_idx" ON "PickupRequest"("status");

-- CreateIndex
CREATE INDEX "PickupRequest_assignedCollectorId_idx" ON "PickupRequest"("assignedCollectorId");

-- CreateIndex
CREATE INDEX "PickupRequest_requesterId_createdAt_idx" ON "PickupRequest"("requesterId", "createdAt");

-- CreateIndex
CREATE INDEX "PickupRequestItem_pickupRequestId_idx" ON "PickupRequestItem"("pickupRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "PickupRequestItem_pickupRequestId_category_key" ON "PickupRequestItem"("pickupRequestId", "category");

-- CreateIndex
CREATE INDEX "Offer_collectorId_idx" ON "Offer"("collectorId");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_pickupRequestId_collectorId_key" ON "Offer"("pickupRequestId", "collectorId");

-- CreateIndex
CREATE INDEX "PickupTrackingEvent_pickupRequestId_idx" ON "PickupTrackingEvent"("pickupRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "WeightRecord_pickupRequestId_key" ON "WeightRecord"("pickupRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_pickupRequestId_key" ON "Rating"("pickupRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_bulkRequestId_key" ON "Rating"("bulkRequestId");

-- CreateIndex
CREATE INDEX "Complaint_status_idx" ON "Complaint"("status");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "WasteRecognitionLog_userId_idx" ON "WasteRecognitionLog"("userId");

-- CreateIndex
CREATE INDEX "WasteAnalysisReport_reviewStatus_idx" ON "WasteAnalysisReport"("reviewStatus");

-- CreateIndex
CREATE INDEX "WasteAnalysisReport_pickupRequestId_idx" ON "WasteAnalysisReport"("pickupRequestId");

-- CreateIndex
CREATE INDEX "WasteAnalysisReport_bulkRequestId_idx" ON "WasteAnalysisReport"("bulkRequestId");

-- CreateIndex
CREATE INDEX "GreenPointsTransaction_userId_idx" ON "GreenPointsTransaction"("userId");

-- CreateIndex
CREATE INDEX "GreenPointsTransaction_userId_createdAt_idx" ON "GreenPointsTransaction"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MobileRechargeTransaction_greenPointsTransactionId_key" ON "MobileRechargeTransaction"("greenPointsTransactionId");

-- CreateIndex
CREATE INDEX "MobileRechargeTransaction_userId_createdAt_idx" ON "MobileRechargeTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BulkMarketplaceRequest_businessId_idx" ON "BulkMarketplaceRequest"("businessId");

-- CreateIndex
CREATE INDEX "BulkMarketplaceRequest_status_idx" ON "BulkMarketplaceRequest"("status");

-- CreateIndex
CREATE INDEX "MarketplaceQuotation_companyId_idx" ON "MarketplaceQuotation"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceQuotation_requestId_companyId_key" ON "MarketplaceQuotation"("requestId", "companyId");

-- CreateIndex
CREATE INDEX "RoutePlan_collectorId_status_idx" ON "RoutePlan"("collectorId", "status");

-- CreateIndex
CREATE INDEX "RouteStop_routePlanId_sequence_idx" ON "RouteStop"("routePlanId", "sequence");

-- CreateIndex
CREATE INDEX "RouteStop_pickupRequestId_idx" ON "RouteStop"("pickupRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "RouteStop_routePlanId_pickupRequestId_key" ON "RouteStop"("routePlanId", "pickupRequestId");

-- CreateIndex
CREATE INDEX "CsrContribution_businessId_idx" ON "CsrContribution"("businessId");

-- CreateIndex
CREATE INDEX "CsrContribution_pickupId_idx" ON "CsrContribution"("pickupId");

-- CreateIndex
CREATE INDEX "Message_senderId_receiverId_idx" ON "Message"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE INDEX "Payment_customerId_idx" ON "Payment"("customerId");

-- CreateIndex
CREATE INDEX "Payment_payerId_idx" ON "Payment"("payerId");

-- CreateIndex
CREATE INDEX "RecyclingCampaign_eventDate_idx" ON "RecyclingCampaign"("eventDate");

-- CreateIndex
CREATE INDEX "CampaignRegistration_campaignId_idx" ON "CampaignRegistration"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignRegistration_userId_idx" ON "CampaignRegistration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRegistration_campaignId_userId_type_key" ON "CampaignRegistration"("campaignId", "userId", "type");

-- CreateIndex
CREATE INDEX "CampaignVideo_campaignId_idx" ON "CampaignVideo"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "_IgnoredPickups_AB_unique" ON "_IgnoredPickups"("A", "B");

-- CreateIndex
CREATE INDEX "_IgnoredPickups_B_index" ON "_IgnoredPickups"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationCode" ADD CONSTRAINT "EmailVerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetCode" ADD CONSTRAINT "PasswordResetCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectorProfile" ADD CONSTRAINT "CollectorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectorProfile" ADD CONSTRAINT "CollectorProfile_verificationReviewedByAdminId_fkey" FOREIGN KEY ("verificationReviewedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclingCompanyProfile" ADD CONSTRAINT "RecyclingCompanyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclingCompanyProfile" ADD CONSTRAINT "RecyclingCompanyProfile_verificationReviewedByAdminId_fkey" FOREIGN KEY ("verificationReviewedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_verificationReviewedByAdminId_fkey" FOREIGN KEY ("verificationReviewedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupRequest" ADD CONSTRAINT "PickupRequest_assignedCollectorId_fkey" FOREIGN KEY ("assignedCollectorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupRequest" ADD CONSTRAINT "PickupRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupRequestItem" ADD CONSTRAINT "PickupRequestItem_pickupRequestId_fkey" FOREIGN KEY ("pickupRequestId") REFERENCES "PickupRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_pickupRequestId_fkey" FOREIGN KEY ("pickupRequestId") REFERENCES "PickupRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupTrackingEvent" ADD CONSTRAINT "PickupTrackingEvent_pickupRequestId_fkey" FOREIGN KEY ("pickupRequestId") REFERENCES "PickupRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeightRecord" ADD CONSTRAINT "WeightRecord_loggedByCollectorId_fkey" FOREIGN KEY ("loggedByCollectorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeightRecord" ADD CONSTRAINT "WeightRecord_pickupRequestId_fkey" FOREIGN KEY ("pickupRequestId") REFERENCES "PickupRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_bulkRequestId_fkey" FOREIGN KEY ("bulkRequestId") REFERENCES "BulkMarketplaceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_pickupRequestId_fkey" FOREIGN KEY ("pickupRequestId") REFERENCES "PickupRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_againstUserId_fkey" FOREIGN KEY ("againstUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_complainantId_fkey" FOREIGN KEY ("complainantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_pickupRequestId_fkey" FOREIGN KEY ("pickupRequestId") REFERENCES "PickupRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_bulkRequestId_fkey" FOREIGN KEY ("bulkRequestId") REFERENCES "BulkMarketplaceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_resolvedByAdminId_fkey" FOREIGN KEY ("resolvedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_relatedPickupRequestId_fkey" FOREIGN KEY ("relatedPickupRequestId") REFERENCES "PickupRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteRecognitionLog" ADD CONSTRAINT "WasteRecognitionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteAnalysisReport" ADD CONSTRAINT "WasteAnalysisReport_pickupRequestId_fkey" FOREIGN KEY ("pickupRequestId") REFERENCES "PickupRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteAnalysisReport" ADD CONSTRAINT "WasteAnalysisReport_bulkRequestId_fkey" FOREIGN KEY ("bulkRequestId") REFERENCES "BulkMarketplaceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteAnalysisReport" ADD CONSTRAINT "WasteAnalysisReport_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteAnalysisReport" ADD CONSTRAINT "WasteAnalysisReport_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GreenPointsTransaction" ADD CONSTRAINT "GreenPointsTransaction_pickupRequestId_fkey" FOREIGN KEY ("pickupRequestId") REFERENCES "PickupRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GreenPointsTransaction" ADD CONSTRAINT "GreenPointsTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileRechargeTransaction" ADD CONSTRAINT "MobileRechargeTransaction_greenPointsTransactionId_fkey" FOREIGN KEY ("greenPointsTransactionId") REFERENCES "GreenPointsTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileRechargeTransaction" ADD CONSTRAINT "MobileRechargeTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkMarketplaceRequest" ADD CONSTRAINT "BulkMarketplaceRequest_assignedCompanyId_fkey" FOREIGN KEY ("assignedCompanyId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkMarketplaceRequest" ADD CONSTRAINT "BulkMarketplaceRequest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceQuotation" ADD CONSTRAINT "MarketplaceQuotation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceQuotation" ADD CONSTRAINT "MarketplaceQuotation_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BulkMarketplaceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutePlan" ADD CONSTRAINT "RoutePlan_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_routePlanId_fkey" FOREIGN KEY ("routePlanId") REFERENCES "RoutePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_pickupRequestId_fkey" FOREIGN KEY ("pickupRequestId") REFERENCES "PickupRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CsrContribution" ADD CONSTRAINT "CsrContribution_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CsrContribution" ADD CONSTRAINT "CsrContribution_pickupId_fkey" FOREIGN KEY ("pickupId") REFERENCES "BulkMarketplaceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_pickupId_fkey" FOREIGN KEY ("pickupId") REFERENCES "PickupRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bulkRequestId_fkey" FOREIGN KEY ("bulkRequestId") REFERENCES "BulkMarketplaceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclingCampaign" ADD CONSTRAINT "RecyclingCampaign_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRegistration" ADD CONSTRAINT "CampaignRegistration_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "RecyclingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRegistration" ADD CONSTRAINT "CampaignRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignVideo" ADD CONSTRAINT "CampaignVideo_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "RecyclingCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignVideo" ADD CONSTRAINT "CampaignVideo_uploadedByAdminId_fkey" FOREIGN KEY ("uploadedByAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IgnoredPickups" ADD CONSTRAINT "_IgnoredPickups_A_fkey" FOREIGN KEY ("A") REFERENCES "PickupRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IgnoredPickups" ADD CONSTRAINT "_IgnoredPickups_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

