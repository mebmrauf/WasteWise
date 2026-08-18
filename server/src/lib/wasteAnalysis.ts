import { Prisma, WasteCategory } from "@prisma/client";
import { prisma } from "./prisma";
import { logger } from "./logger";
import { detectLabels, isVisionConfigured, type VisionLabel } from "./visionClient";
import { analyzeWasteWithGemini, isGeminiConfigured } from "./geminiClient";
const MAX_ANALYSIS_PHOTOS = 3;
const REVIEW_CONFIDENCE_THRESHOLD = 0.6;

const PHOTO_MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export interface AnalyzeWasteSubmissionInput {
  pickupRequestId?: string;
  bulkRequestId?: string;
  requesterId: string;
  photoUrls: string[];
  description: string | null;
}

interface LoadedPhoto {
  buffer: Buffer;
  mimeType: string;
}

async function loadPhotoBuffers(urls: string[]): Promise<LoadedPhoto[]> {
  const loaded: LoadedPhoto[] = [];
  for (const url of urls.slice(0, MAX_ANALYSIS_PHOTOS)) {
    if (!url) continue;
    // Basic extraction of extension, fallback to jpg if none is found
    const extMatch = url.match(/\.([a-zA-Z0-9]+)(?:[\?#]|$)/);
    const ext = (extMatch ? extMatch[1].toLowerCase() : "jpg");
    const mimeType = PHOTO_MIME_TYPES[ext] || PHOTO_MIME_TYPES["jpg"];

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image, status: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      loaded.push({ buffer: Buffer.from(arrayBuffer), mimeType });
    } catch (err) {
      logger.warn({ err, url }, "Could not fetch uploaded waste photo for AI analysis");
    }
  }
  return loaded;
}

export async function analyzeWasteSubmission(input: AnalyzeWasteSubmissionInput): Promise<void> {
  try {
    if (!isGeminiConfigured()) return;
    if (input.photoUrls.length === 0 && !input.description?.trim()) return;

    const photos = await loadPhotoBuffers(input.photoUrls);

    let visionLabels: VisionLabel[] | null = null;
    if (photos[0] && isVisionConfigured()) {
      try {
        visionLabels = await detectLabels(photos[0].buffer);
      } catch (err) {
        logger.warn({ err }, "Vision label detection failed during waste analysis; continuing with Gemini only");
      }
    }

    const result = await analyzeWasteWithGemini({
      description: input.description,
      images: photos.map((p) => ({ mimeType: p.mimeType, data: p.buffer.toString("base64") })),
      categories: Object.values(WasteCategory),
      visionLabels,
    });

    const needsAdminReview =
      result.needsReview || !result.suggestedCategory || result.confidence < REVIEW_CONFIDENCE_THRESHOLD;
    await prisma.wasteAnalysisReport.create({
      data: {
        pickupRequestId: input.pickupRequestId ?? null,
        bulkRequestId: input.bulkRequestId ?? null,
        requesterId: input.requesterId,
        photoUrls: input.photoUrls,
        description: input.description,
        visionLabels: visionLabels ? (visionLabels as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        detectedCondition: result.condition,
        estimatedUsagePeriod: result.estimatedUsagePeriod,
        suggestedCategory: result.suggestedCategory,
        confidence: result.confidence,
        aiSummary: result.summary,
        needsAdminReview,
        reviewReason: needsAdminReview ? (result.reviewReason ?? "Low-confidence or unrecognized classification") : null,
      },
    });
  } catch (err) {
    logger.error({ err, pickupRequestId: input.pickupRequestId, bulkRequestId: input.bulkRequestId }, "Waste analysis failed");
  }
}
