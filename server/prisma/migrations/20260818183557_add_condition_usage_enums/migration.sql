-- CreateEnum
CREATE TYPE "WasteItemCondition" AS ENUM ('NEW', 'LIGHTLY_USED', 'MODERATELY_USED', 'HEAVILY_USED', 'DAMAGED', 'BROKEN', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "WasteUsagePeriod" AS ENUM ('UNDER_6_MONTHS', 'SIX_MONTHS_TO_1_YEAR', 'ONE_TO_3_YEARS', 'THREE_TO_5_YEARS', 'OVER_5_YEARS', 'UNKNOWN');

-- AlterTable
ALTER TABLE "WasteAnalysisReport" DROP COLUMN "detectedCondition",
ADD COLUMN     "detectedCondition" "WasteItemCondition",
DROP COLUMN "estimatedUsagePeriod",
ADD COLUMN     "estimatedUsagePeriod" "WasteUsagePeriod";
