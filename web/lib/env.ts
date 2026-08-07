import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url("must be a valid URL, e.g. http://localhost:4000/api/v1"),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("must be a valid URL, e.g. http://localhost:3000")
    .optional()
    .default("http://localhost:3000"),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional().default(""),
  NEXT_PUBLIC_FACEBOOK_APP_ID: z.string().optional().default(""),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional().default(""),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional().default(""),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function loadPublicEnv(
  source: Record<string, string | undefined> = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_FACEBOOK_APP_ID: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  },
): PublicEnv {
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_API_URL: source.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: source.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: source.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_FACEBOOK_APP_ID: source.NEXT_PUBLIC_FACEBOOK_APP_ID,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: source.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_SENTRY_DSN: source.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: source.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
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

export const publicEnv: PublicEnv = loadPublicEnv();
