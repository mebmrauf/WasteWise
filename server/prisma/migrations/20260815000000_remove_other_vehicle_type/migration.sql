-- Remove 'OTHER' from the VehicleType enum. The live database already lacks
-- this value (removed out-of-band from Prisma's migration history at some
-- point) and no CollectorProfile row ever used it — this migration only
-- brings the migration history back in sync with schema.prisma so a fresh
-- database created via `prisma migrate deploy` ends up in the same state.
ALTER TYPE "VehicleType" RENAME TO "VehicleType_old";
CREATE TYPE "VehicleType" AS ENUM ('HANDCART', 'BICYCLE_VAN', 'MOTORCYCLE_VAN', 'PICKUP_TRUCK', 'TRUCK');
ALTER TABLE "CollectorProfile" ALTER COLUMN "vehicleType" TYPE "VehicleType" USING ("vehicleType"::text::"VehicleType");
DROP TYPE "VehicleType_old";
