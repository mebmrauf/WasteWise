// Client-side API for /api/v1/sustainability/* — a standalone feature that
// computes CO2-reduction and recycling-impact reports live from completed
// pickups (see server/src/lib/sustainabilityCalculator.ts). No data is
// stored separately; every call recomputes from the current source of
// truth. Reuses auth.ts's authFetch, same pattern as lib/api/wasteRecognition.ts.
import { authFetch } from "./auth";

export type WasteCategory = "PLASTIC" | "PAPER" | "ORGANIC" | "GLASS" | "METAL" | "ELECTRONIC";

export interface CategoryImpact {
  category: WasteCategory;
  totalKg: number;
  co2AvoidedKg: number;
}

export interface SustainabilityReport {
  totalKg: number;
  totalCo2AvoidedKg: number;
  equivalentKmNotDriven: number;
  completedPickupCount: number;
  byCategory: CategoryImpact[];
  generatedAt: string;
}

/** GET /api/v1/sustainability/report — the current user's own impact report. */
export function getMySustainabilityReport(): Promise<{ report: SustainabilityReport }> {
  return authFetch<{ report: SustainabilityReport }>("/sustainability/report", { method: "GET" });
}