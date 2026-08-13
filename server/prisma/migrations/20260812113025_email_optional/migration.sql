-- Email is no longer required either: signup now accepts email, phone, or
-- both, with a verified phone counting as sufficient identity proof on its
-- own (see auth.schemas.ts).
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
