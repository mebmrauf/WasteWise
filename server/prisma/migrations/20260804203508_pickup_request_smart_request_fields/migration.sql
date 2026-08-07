-- Smart Pickup Request (Layer 2) schema changes on PickupRequest:
--   * category (single WasteCategory)      -> categories (WasteCategory[], multi-select)
--   * estimatedQuantityKg (free Float)      -> loadSize (LoadSize enum, preset buckets)
--   * pickupAddress                          -> pickupFormattedAddress (+ new placeId)
--   * WasteCategory enum: drop MIXED/OTHER, keep the 6-category system
--     (PLASTIC, PAPER, ORGANIC, GLASS, METAL, ELECTRONIC)
--
-- NOTE: `npx prisma migrate diff` generated this as three separate blocks in
-- an order that does not apply cleanly (an AlterEnum block referencing the
-- not-yet-created "categories" column before the AlterTable block that adds
-- it, plus a needless USING-cast for a column that's being dropped anyway).
-- Rewritten by hand below: drop the old columns/enum usage first, then swap
-- the enum, then add the new columns. Verified zero rows existed in
-- "PickupRequest" at migration time (the only row was disposable seed test
-- data, deleted beforehand — see server/prisma/seed.ts), so no USING/backfill
-- clause is needed for any of the new NOT NULL columns.

-- CreateEnum
CREATE TYPE "LoadSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE');

-- AlterTable: drop old columns first, so nothing references the old
-- 8-value WasteCategory enum by the time it's redefined below.
ALTER TABLE "PickupRequest" DROP COLUMN "category",
DROP COLUMN "estimatedQuantityKg",
DROP COLUMN "pickupAddress";

-- AlterEnum: WasteCategory is now unreferenced by any column, so a plain
-- drop-and-recreate is safe (no USING conversion needed, unlike the typical
-- Prisma-generated enum-value-removal pattern).
DROP TYPE "WasteCategory";
CREATE TYPE "WasteCategory" AS ENUM ('PLASTIC', 'PAPER', 'ORGANIC', 'GLASS', 'METAL', 'ELECTRONIC');

-- AlterTable: add the new Smart Pickup Request columns.
ALTER TABLE "PickupRequest" ADD COLUMN     "categories" "WasteCategory"[],
ADD COLUMN     "loadSize" "LoadSize" NOT NULL,
ADD COLUMN     "pickupFormattedAddress" TEXT NOT NULL,
ADD COLUMN     "placeId" TEXT NOT NULL;
