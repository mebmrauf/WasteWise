-- AlterTable: add radius-based service coverage fields to CollectorProfile
ALTER TABLE "CollectorProfile" ADD COLUMN     "serviceAreaPlaceId" TEXT,
ADD COLUMN     "serviceAreaFormattedAddress" TEXT,
ADD COLUMN     "serviceAreaLatitude" DOUBLE PRECISION,
ADD COLUMN     "serviceAreaLongitude" DOUBLE PRECISION,
ADD COLUMN     "serviceAreaRadiusKm" DOUBLE PRECISION;
