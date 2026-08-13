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

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: originList,

  DATABASE_URL: z
    .string()
    .min(1, "is required")
    .refine((url) => url.startsWith("postgresql://") || url.startsWith("postgres://"), {
      message: "must be a postgresql:// connection string",
    }),

  JWT_ACCESS_SECRET: z.string().min(16, "must be at least 16 characters"),
  JWT_REFRESH_SECRET: z.string().min(16, "must be at least 16 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_CALLBACK_URL: z.string().optional().default(""),

  FACEBOOK_APP_ID: z.string().optional().default(""),
  FACEBOOK_APP_SECRET: z.string().optional().default(""),
  FACEBOOK_CALLBACK_URL: z.string().optional().default(""),

  GOOGLE_MAPS_SERVER_API_KEY: z.string().optional().default(""),
  // --- AI Vision (Waste Recognition, optional — feature disabled if blank) ---
  GOOGLE_VISION_API_KEY: z.string().transform(s => s.replace(/^["']|["']$/g, '').trim()).optional().default(""),

  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),

  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  EMAIL_USER: z.string().optional().default(""),
  EMAIL_PASS: z.string().optional().default(""),
  EMAIL_FROM: z.string().optional().default("WasteWise <onboarding@resend.dev>"),

  SENTRY_DSN: z.string().optional().default(""),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

  ADMIN_EMAIL: z.string().email("must be a valid email for the admin user").default("admin@wastewise.com"),
  ADMIN_PASSWORD: z.string().min(8, "admin password must be at least 8 characters"),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
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

export const env: Env = parseEnv();
