-- Business accounts (User.accountType = BUSINESS) previously had no verification
-- state at all. This mirrors RecyclingCompanyProfile/CollectorProfile so signup
-- can create a PENDING profile that an admin later approves.

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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessProfile_userId_key" ON "BusinessProfile"("userId");

-- AddForeignKey
ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_verificationReviewedByAdminId_fkey" FOREIGN KEY ("verificationReviewedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

