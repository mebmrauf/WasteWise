// zod request schemas for /api/v1/users/*. Kept alongside routes/users.ts,
// mirroring the per-router convention already established by
// routes/auth.schemas.ts.
import { z } from "zod";

// Same loose E.164-ish check as auth.schemas.ts — kept in sync deliberately;
// if this needs to change, change both together.
const phoneRegex = /^\+?[0-9]{7,15}$/;

// Partial update of the *editable* profile fields only. `.strict()` rejects
// any other key outright (400 VALIDATION_ERROR) rather than silently
// dropping it — this is the explicit-reject behavior requested for
// `email`/`role`/`accountType`/`avatarUrl` (identity/permission fields, or in
// avatarUrl's case, a field that must only ever be set by the dedicated
// upload endpoint, never as an arbitrary client-supplied string). Likewise
// `formattedAddress`/`latitude`/`longitude` are server-derived (resolved
// from `placeId` via the Google Geocoding API in the route handler) and are
// never accepted as direct client input — the client only ever sends the
// `placeId` it got from Google Places Autocomplete.
export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required").max(120).optional(),
    // `.nullable()` lets a client send `phone: null` to explicitly clear a
    // previously-set phone number (User.phone is nullable in the Prisma
    // schema) — distinct from omitting the key entirely (leave untouched)
    // and from sending an actually-invalid non-empty string (still rejected
    // by the regex below).
    phone: z.string().trim().regex(phoneRegex, "Enter a valid phone number").nullable().optional(),
    placeId: z.string().trim().min(1, "placeId cannot be empty").max(300).optional(),
    emailNotificationsEnabled: z.boolean().optional(),
    smsNotificationsEnabled: z.boolean().optional(),
  })
  .strict();
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
