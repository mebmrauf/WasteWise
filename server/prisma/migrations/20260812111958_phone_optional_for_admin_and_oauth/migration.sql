-- Phone is no longer required for every account: the seeded admin has no
-- phone, and OAuth signups don't collect one (they add/verify it later from
-- their profile instead of getting a placeholder). Password-signup for
-- USER/COLLECTOR/RECYCLING_COMPANY still requires a verified phone at the
-- application layer (see auth.schemas.ts), but the column itself must allow
-- NULL to support the exceptions above.
ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;
