// Runtime validation for the public (NEXT_PUBLIC_*) env vars this app reads.
// Only NEXT_PUBLIC_-prefixed vars are ever exposed to the browser bundle —
// see web/web.env.local.example for the full contract.
import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url("must be a valid URL, e.g. http://localhost:4000/api/v1"),
  // Used for metadataBase (resolving relative Open Graph/Twitter image URLs)
  // — defaults to local dev; set to the real deployed origin once one exists.
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("must be a valid URL, e.g. http://localhost:3000")
    .optional()
    .default("http://localhost:3000"),
  // Optional — related OAuth/observability features are simply disabled if blank.
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional().default(""),
  NEXT_PUBLIC_FACEBOOK_APP_ID: z.string().optional().default(""),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional().default(""),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional().default(""),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

/**
 * Pure function — reads from `source` (defaults to the individual `NEXT_PUBLIC_*` vars off
 * `process.env`). Exported separately from `publicEnv` so tests can exercise success/failure
 * paths without depending on the ambient process.env at import time.
 *
 * The default must spell out each `process.env.NEXT_PUBLIC_*` access individually rather than
 * passing the bare `process.env` object — Next.js's client-side env inlining only replaces the
 * exact literal expression `process.env.NEXT_PUBLIC_X` wherever it textually appears in
 * source, not arbitrary property access through a variable. Since `publicEnv` below is
 * imported by "use client" modules, a bare `process.env` reference here breaks in the browser
 * bundle even though it works server-side.
 */
export function loadPublicEnv(
  source: Record<string, string | undefined> = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_FACEBOOK_APP_ID: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  },
): PublicEnv {
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_API_URL: source.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: source.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: source.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_FACEBOOK_APP_ID: source.NEXT_PUBLIC_FACEBOOK_APP_ID,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: source.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_SENTRY_DSN: source.NEXT_PUBLIC_SENTRY_DSN,
  });

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid public environment configuration:\n${issues}\n\n` +
        "Check web/.env.local against web/web.env.local.example.",
    );
  }

  return result.data;
}

/**
 * Eagerly-validated public env, computed the first time this module is
 * imported by application code (pages/layouts). Fails fast with a clear
 * error at build/render time instead of `undefined` surfacing deep in a
 * component.
 */
export const publicEnv: PublicEnv = loadPublicEnv();
