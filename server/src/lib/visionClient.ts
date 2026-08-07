// Thin wrapper around the Google Cloud Vision REST API (label detection).
// Deliberately a plain fetch() call against the REST endpoint with an API
// key (see server.env.example: GOOGLE_VISION_API_KEY) rather than the
// @google-cloud/vision SDK, which expects a service-account JSON credential
// file — a heavier setup than this project needs for a single label-
// detection call. Mirrors the "server-side only, never exposed to the
// browser" pattern already used for GOOGLE_MAPS_SERVER_API_KEY (see
// lib/geocoding.ts).
import { env } from "./env";
import { logger } from "./logger";

export interface VisionLabel {
  description: string; // e.g. "Plastic bottle", "Glass", "Metal"
  score: number; // 0.0–1.0 confidence
}

export class VisionApiError extends Error {
  constructor(
    message: string,
    public readonly details: unknown,
  ) {
    super(message);
    this.name = "VisionApiError";
  }
}

export function isVisionConfigured(): boolean {
  return Boolean(env.GOOGLE_VISION_API_KEY);
}

/**
 * Sends an image buffer to the Vision API's label detection feature and
 * returns the raw label list, sorted by confidence (highest first, as the
 * API already returns them). Throws VisionApiError on any upstream failure
 * (bad key, quota exceeded, malformed image) — callers should catch this
 * distinctly from validation errors, same pattern as
 * GeocodingResolutionError in lib/geocoding.ts.
 */
export async function detectLabels(imageBuffer: Buffer): Promise<VisionLabel[]> {
  if (!isVisionConfigured()) {
    throw new VisionApiError("GOOGLE_VISION_API_KEY is not configured", null);
  }

  const base64Image = imageBuffer.toString("base64");

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${env.GOOGLE_VISION_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: "LABEL_DETECTION", maxResults: 10 }],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    logger.error({ status: response.status, body }, "Vision API request failed");
    throw new VisionApiError("Vision API request failed", { status: response.status, body });
  }

  const data = (await response.json()) as {
    responses?: Array<{
      labelAnnotations?: Array<{ description: string; score: number }>;
      error?: unknown;
    }>;
  };
  const result = data?.responses?.[0];

  if (result?.error) {
    logger.error({ err: result.error }, "Vision API returned an error");
    throw new VisionApiError("Vision API returned an error", result.error);
  }

  const annotations: Array<{ description: string; score: number }> =
    result?.labelAnnotations ?? [];

  return annotations.map((a) => ({ description: a.description, score: a.score }));
}