// Maps raw Vision API labels (free-text strings like "Plastic bottle",
// "Tin can", "Banana") onto our fixed WasteCategory enum (see
// prisma/schema.prisma), plus a recyclability verdict and a short prep tip.
//
// This is deliberately a simple keyword-matching table, not a second AI
// call — Vision already did the hard "what is this" work; this layer just
// translates its open-ended vocabulary into our closed set of categories so
// the rest of the app (and future Demand Forecast / Sustainability Reports
// work) can rely on a consistent enum rather than arbitrary strings.
import { WasteCategory } from "@prisma/client";

interface CategoryRule {
  category: WasteCategory;
  isRecyclable: boolean;
  preparationTip: string;
  // Lowercase keywords checked against each Vision label description.
  keywords: string[];
}

// Order matters: checked top-to-bottom, first match wins. More specific
// categories (e.g. "electronic") are listed before broad catch-alls.
const CATEGORY_RULES: CategoryRule[] = [
  {
    category: WasteCategory.ELECTRONIC,
    isRecyclable: true,
    preparationTip: "Remove batteries if possible and drop off at an e-waste collection point.",
    keywords: ["electronic", "battery", "circuit", "cable", "phone", "computer", "charger"],
  },
  {
    category: WasteCategory.GLASS,
    isRecyclable: true,
    preparationTip: "Rinse out any residue and remove the cap before recycling.",
    keywords: ["glass", "bottle glass", "jar"],
  },
  {
    category: WasteCategory.METAL,
    isRecyclable: true,
    preparationTip: "Rinse out any food residue. Cans can usually go in as-is.",
    keywords: ["metal", "tin can", "aluminium", "aluminum", "can", "foil"],
  },
  {
    category: WasteCategory.PLASTIC,
    isRecyclable: true,
    preparationTip: "Rinse out any residue and remove the cap and label if possible.",
    keywords: ["plastic", "bottle", "container", "packaging", "bag"],
  },
  {
    category: WasteCategory.PAPER,
    isRecyclable: true,
    preparationTip: "Keep it dry and flatten boxes to save space.",
    keywords: ["paper", "cardboard", "box", "newspaper", "magazine"],
  },
  {
    category: WasteCategory.ORGANIC,
    isRecyclable: false,
    preparationTip: "Compost if possible — not suitable for the recycling stream.",
    keywords: ["food", "fruit", "vegetable", "banana", "leaf", "plant", "organic"],
  },
];

export interface WasteClassification {
  detectedCategory: WasteCategory;
  isRecyclable: boolean;
  preparationTip: string;
  confidence: number;
  matchedLabel: string;
}
/**
 * Looks up the recyclability + prep tip for a category the user picked
 * directly (not derived from Vision labels) — used when a user corrects a
 * scan result via PATCH /api/v1/waste-recognition/:id/correct.
 */
export function getCategoryDefaults(
  category: WasteCategory,
): Pick<WasteClassification, "isRecyclable" | "preparationTip"> {
  const rule = CATEGORY_RULES.find((r) => r.category === category);
  if (rule) {
    return { isRecyclable: rule.isRecyclable, preparationTip: rule.preparationTip };
  }
  return {
    isRecyclable: false,
    preparationTip: "Check with your local waste guidelines.",
  };
}
/**
 * Picks the best matching category rule against a list of Vision labels
 * (already sorted by confidence, highest first — see lib/visionClient.ts).
 * Falls back to WasteCategory.OTHER with isRecyclable=false if nothing
 * matches, since an unrecognized item shouldn't be silently guessed as
 * recyclable.
 */
export function classifyLabels(
  labels: Array<{ description: string; score: number }>,
): WasteClassification {
  for (const label of labels) {
    const normalized = label.description.toLowerCase();
    for (const rule of CATEGORY_RULES) {
      if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
        return {
          detectedCategory: rule.category,
          isRecyclable: rule.isRecyclable,
          preparationTip: rule.preparationTip,
          confidence: label.score,
          matchedLabel: label.description,
        };
      }
    }
  }

  return {
    detectedCategory: WasteCategory.OTHER,
    isRecyclable: false,
    preparationTip: "Category not recognized — check with your local waste guidelines.",
    confidence: labels[0]?.score ?? 0,
    matchedLabel: labels[0]?.description ?? "unknown",
  };
}