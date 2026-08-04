-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('HOUSEHOLD', 'BUSINESS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountType" "AccountType";
