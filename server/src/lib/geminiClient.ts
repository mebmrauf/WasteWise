import { z } from "zod";
import { WasteCategory, WasteItemCondition, WasteUsagePeriod } from "@prisma/client";
import { env } from "./env";
import { logger } from "./logger";
import type { VisionLabel } from "./visionClient";

const CONDITION_VALUES = Object.values(WasteItemCondition);
const USAGE_PERIOD_VALUES = Object.values(WasteUsagePeriod);

export class GeminiApiError extends Error {
  constructor(
    message: string,
    public readonly details: unknown,
  ) {
    super(message);
    this.name = "GeminiApiError";
  }
}

export function isGeminiConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY);
}

export interface GeminiImageInput {
  mimeType: string;
  /** Base64-encoded image bytes (no data: URI prefix). */
  data: string;
}

export interface AnalyzeWasteWithGeminiInput {
  description: string | null;
  images: GeminiImageInput[];
  /** The platform's closed set of waste categories the item must be matched against. */
  categories: WasteCategory[];
  /** Best-effort Vision label detection on the first photo, if available. */
  visionLabels: VisionLabel[] | null;
}

export interface GeminiWasteAnalysis {
  condition: WasteItemCondition;
  estimatedUsagePeriod: WasteUsagePeriod;
  suggestedCategory: WasteCategory | null;
  confidence: number;
  summary: string;
  needsReview: boolean;
  reviewReason: string | null;
}

const geminiResponseSchema = z.object({
  condition: z.string(),
  estimatedUsagePeriod: z.string(),
  suggestedCategory: z.string(),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  needsReview: z.boolean(),
  reviewReason: z.string().nullable().optional(),
});

function buildPrompt(input: AnalyzeWasteWithGeminiInput): string {
  const lines = [
    "You are a waste triage assistant for a recycling logistics platform in Bangladesh.",
    "Analyze the submitted item using the photo(s) and description below.",
    "",
    `Predefined waste categories: ${input.categories.join(", ")}.`,
    "",
    `User-provided description: ${input.description?.trim() || "(none provided)"}`,
  ];
  if (input.visionLabels && input.visionLabels.length > 0) {
    lines.push(
      `Automated image labels (for reference only, may be imprecise): ${input.visionLabels
        .map((l) => `${l.description} (${Math.round(l.score * 100)}%)`)
        .join(", ")}`,
    );
  }
  lines.push(
    "",
    "Determine:",
    `1. The item's general condition — exactly one of: ${CONDITION_VALUES.join(", ")}. Use UNKNOWN if it can't be determined.`,
    `2. An approximate estimate of how long the item has been used before being discarded — exactly one of: ${USAGE_PERIOD_VALUES.join(", ")}. Use UNKNOWN if it can't reasonably be inferred.`,
    "3. Which single predefined category it best fits, judged by the item's dominant/primary material or how it would actually be sorted at a recycling facility. Almost every real-world object is technically made of more than one material (a chair has metal, foam, and fabric; a phone has plastic, metal, and glass) — that alone is NOT a reason to avoid picking a category. Use OTHER for genuinely mixed-material items where no single material dominates, rather than treating \"it's composite\" as unclassifiable. Only respond \"UNCERTAIN\" if you cannot tell what the item even is, or it plausibly represents an entirely new waste stream this category list has no reasonable answer for (not even OTHER).",
    "4. A confidence score from 0 to 1 for that category decision.",
    "5. Whether this submission needs human (admin) review. This is specifically about whether the CATEGORY LIST itself might need to change — set needsReview to true only when: the category is UNCERTAIN, confidence is genuinely low (below ~0.5), or the photo/description is ambiguous, contradictory, or unreadable. Do NOT set needsReview to true just because the item has multiple materials, needs disassembly, or is a composite object — if you could confidently assign a category (including OTHER), that is a successful classification and does not need review, even though it may still be operationally complex to actually process.",
    "6. If needsReview is true, a short reviewReason explaining why; otherwise null.",
    "",
    "Respond with only the JSON object matching the given schema — no other text.",
  );
  return lines.join("\n");
}

export async function analyzeWasteWithGemini(
  input: AnalyzeWasteWithGeminiInput,
): Promise<GeminiWasteAnalysis> {
  if (!isGeminiConfigured()) {
    throw new GeminiApiError("GEMINI_API_KEY is not configured", null);
  }

  const parts: unknown[] = [{ text: buildPrompt(input) }];
  for (const image of input.images) {
    parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              condition: { type: "STRING", enum: CONDITION_VALUES },
              estimatedUsagePeriod: { type: "STRING", enum: USAGE_PERIOD_VALUES },
              suggestedCategory: {
                type: "STRING",
                enum: [...input.categories, "UNCERTAIN"],
              },
              confidence: { type: "NUMBER" },
              summary: { type: "STRING" },
              needsReview: { type: "BOOLEAN" },
              reviewReason: { type: "STRING", nullable: true },
            },
            required: ["condition", "estimatedUsagePeriod", "suggestedCategory", "confidence", "summary", "needsReview"],
          },
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    logger.error({ status: response.status, body }, "Gemini API request failed");
    throw new GeminiApiError("Gemini API request failed", { status: response.status, body });
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new GeminiApiError("Gemini returned no content", data);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch (err) {
    throw new GeminiApiError("Gemini returned malformed JSON", { text, err });
  }

  const parsed = geminiResponseSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new GeminiApiError("Gemini response did not match the expected schema", parsed.error.issues);
  }

  const suggestedCategory =
    parsed.data.suggestedCategory in WasteCategory
      ? (parsed.data.suggestedCategory as WasteCategory)
      : null;
  const condition = CONDITION_VALUES.includes(parsed.data.condition as WasteItemCondition)
    ? (parsed.data.condition as WasteItemCondition)
    : WasteItemCondition.UNKNOWN;
  const estimatedUsagePeriod = USAGE_PERIOD_VALUES.includes(parsed.data.estimatedUsagePeriod as WasteUsagePeriod)
    ? (parsed.data.estimatedUsagePeriod as WasteUsagePeriod)
    : WasteUsagePeriod.UNKNOWN;

  return {
    condition,
    estimatedUsagePeriod,
    suggestedCategory,
    confidence: parsed.data.confidence,
    summary: parsed.data.summary,
    needsReview: parsed.data.needsReview,
    reviewReason: parsed.data.reviewReason ?? null,
  };
}
