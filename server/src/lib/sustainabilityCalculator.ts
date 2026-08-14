import { WasteCategory } from "@prisma/client";
import { prisma } from "./prisma"; // ADJUST: use however your project imports the shared Prisma client — check the top of wasteRecognition.ts
import { CO2_FACTORS_KG_PER_KG, LOAD_SIZE_KG_ESTIMATE, KG_CO2_PER_KM_DRIVEN } from "./co2Factors";

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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// userId omitted => platform-wide report across all users
export async function computeSustainabilityReport(userId?: string): Promise<SustainabilityReport> {
  const pickups = await prisma.pickupRequest.findMany({
    where: {
      status: "COMPLETED",
      ...(userId ? { requesterId: userId } : {}),
    },
    include: { items: true, weightRecord: true },
  });

  const byCategoryMap = new Map<WasteCategory, number>();

  for (const pickup of pickups) {
    if (!pickup.items.length) continue;

    const totalWeightKg =
      pickup.weightRecord?.exactWeightKg ??
      (pickup.weightRecord
        ? (pickup.weightRecord.estimatedMinKg + pickup.weightRecord.estimatedMaxKg) / 2
        : null);

    if (totalWeightKg == null) continue; // no weight logged yet, skip

    const shareWeights = pickup.items.map((item) => LOAD_SIZE_KG_ESTIMATE[item.loadSize]);
    const shareTotal = shareWeights.reduce((a, b) => a + b, 0);

    pickup.items.forEach((item, i) => {
      const itemKg = shareTotal > 0 ? totalWeightKg * (shareWeights[i] / shareTotal) : 0;
      byCategoryMap.set(item.category, (byCategoryMap.get(item.category) ?? 0) + itemKg);
    });
  }

  const byCategory: CategoryImpact[] = Array.from(byCategoryMap.entries())
    .map(([category, totalKg]) => ({
      category,
      totalKg: round2(totalKg),
      co2AvoidedKg: round2(totalKg * CO2_FACTORS_KG_PER_KG[category]),
    }))
    .sort((a, b) => b.totalKg - a.totalKg);

  const totalKg = round2(byCategory.reduce((sum, c) => sum + c.totalKg, 0));
  const totalCo2AvoidedKg = round2(byCategory.reduce((sum, c) => sum + c.co2AvoidedKg, 0));

  return {
    totalKg,
    totalCo2AvoidedKg,
    equivalentKmNotDriven: round2(totalCo2AvoidedKg / KG_CO2_PER_KM_DRIVEN),
    completedPickupCount: pickups.length,
    byCategory,
    generatedAt: new Date().toISOString(),
  };
}