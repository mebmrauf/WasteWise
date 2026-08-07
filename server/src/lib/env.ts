// Env validation — fail fast at boot with a clear, listed error instead of a
// cryptic runtime crash three requests later.
//
// Schema is derived from server/server.env.example. Anything required there is
// required here; anything optional/blank-ok there is optional here. If you add
// a new env var, add it to BOTH server.env.example and this schema.
//
// NOTE: this module does NOT load a .env file itself (no `dotenv/config` side
// effect) — it only reads `process.env`. That's deliberate: the real entry
// point (src/index.ts) loads server/.env via dotenv before importing this
// module, while tests populate process.env from server/.env.test via the
// vitest setup file. Keeping the load out of this module means importing it
// in a test can never accidentally read real secrets from server/.env.
import { z } from "zod";

const originList = z
  .string()
  .min(1, "must be a non-empty origin, or a comma-separated list of origins")
  .transform((value) =>
    value
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );

export const envSchema = z.object({
  // --- App ---
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: originList,

  // --- Database ---
  DATABASE_URL: z
    .string()
    .min(1, "is required")
    .refine((url) => url.startsWith("postgresql://") || url.startsWith("postgres://"), {
      message: "must be a postgresql:// connection string",
    }),

  // --- Auth (JWT) ---
  JWT_ACCESS_SECRET: z.string().min(16, "must be at least 16 characters"),
  JWT_REFRESH_SECRET: z.string().min(16, "must be at least 16 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // --- OAuth: Google (optional — feature is disabled if blank) ---
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_CALLBACK_URL: z.string().optional().default(""),

  // --- OAuth: Facebook (optional — feature is disabled if blank) ---
  FACEBOOK_APP_ID: z.string().optional().default(""),
  FACEBOOK_APP_SECRET: z.string().optional().default(""),
  FACEBOOK_CALLBACK_URL: z.string().optional().default(""),

  // --- Google Maps (server-side geocoding, optional — feature disabled if blank) ---
  GOOGLE_MAPS_SERVER_API_KEY: z.string().optional().default(""),
  // --- AI Vision (Waste Recognition, optional — feature disabled if blank) ---
  GOOGLE_VISION_API_KEY: z.string().optional().default(""),

  // --- Email (forgot-password verification codes) — optional, naming is not
  // yet finalized between SMTP_* (server.env.example) and EMAIL_* (server/.env
  // in the wild); accept either until this settles on one. ---
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  EMAIL_USER: z.string().optional().default(""),
  EMAIL_PASS: z.string().optional().default(""),

  // --- Observability (optional) ---
  SENTRY_DSN: z.string().optional().default(""),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parses and validates `source` (defaults to `process.env`) against the schema.
 * Pure function — does not touch process.exit — so it's safe to unit test.
 */
export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration — refusing to start.\n${issues}\n\n` +
        "Check server/.env against server/server.env.example and fix the values above.",
    );
  }
  return result.data;
}

/**
 * Eagerly-validated env, computed the first time this module is imported.
 * Import this (not `parseEnv`) from application code so the process fails
 * fast at boot. Tests that want to exercise failure paths should call
 * `parseEnv()` directly with a fake source instead of importing `env`.
 */
export const env: Env = parseEnv();
