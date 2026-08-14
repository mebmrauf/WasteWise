-- Remove the "OTHER" value from the VehicleType enum. Confirmed 0 rows in
-- CollectorProfile/MarketplaceQuotation use it before this migration was written.
BEGIN;

CREATE TYPE "VehicleType_new" AS ENUM ('HANDCART', 'BICYCLE_VAN', 'MOTORCYCLE_VAN', 'PICKUP_TRUCK', 'TRUCK');

ALTER TABLE "CollectorProfile" ALTER COLUMN "vehicleType" TYPE "VehicleType_new" USING ("vehicleType"::text::"VehicleType_new");
ALTER TABLE "MarketplaceQuotation" ALTER COLUMN "vehicleType" TYPE "VehicleType_new" USING ("vehicleType"::text::"VehicleType_new");

ALTER TYPE "VehicleType" RENAME TO "VehicleType_old";
ALTER TYPE "VehicleType_new" RENAME TO "VehicleType";
DROP TYPE "VehicleType_old";

COMMIT;
