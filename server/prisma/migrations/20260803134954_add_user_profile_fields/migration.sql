-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" TEXT,
ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "smsNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
