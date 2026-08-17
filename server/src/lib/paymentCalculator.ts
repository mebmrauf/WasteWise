import { prisma } from "./prisma";

export async function calculateSmartPickupAmount(pickupId: string): Promise<{ amount: number; customerId: string }> {
  const pickup = await prisma.pickupRequest.findUniqueOrThrow({
    where: { id: pickupId },
    include: { items: true },
  });

  const offer = await prisma.offer.findFirst({
    where: { pickupRequestId: pickupId, status: "ACCEPTED" },
  });

  if (!offer || !offer.bidAmountsPerKg) {
    throw new Error("No accepted offer or bid amounts found for this pickup.");
  }

  const bidAmountsPerKg = offer.bidAmountsPerKg as Record<string, number>;
  let totalAmount = 0;

  for (const item of pickup.items) {
    if (item.exactWeightKg && bidAmountsPerKg[item.category]) {
      totalAmount += item.exactWeightKg * bidAmountsPerKg[item.category];
    }
  }

  return { amount: totalAmount, customerId: pickup.requesterId };
}

export async function calculateBulkPickupAmount(bulkRequestId: string): Promise<{ amount: number; customerId: string }> {
  const bulkRequest = await prisma.bulkMarketplaceRequest.findUniqueOrThrow({
    where: { id: bulkRequestId },
  });

  const quotation = await prisma.marketplaceQuotation.findFirst({
    where: { requestId: bulkRequestId, status: "ACCEPTED" },
  });

  if (!quotation) {
    throw new Error("No accepted quotation found for this bulk request.");
  }

  // Use verified weights and pricesPerKg if available
  let totalAmount = 0;
  if (bulkRequest.verifiedWeights && quotation.pricesPerKg) {
    const verifiedWeights = bulkRequest.verifiedWeights as Record<string, number>;
    const pricesPerKg = quotation.pricesPerKg as Record<string, number>;
    
    for (const [category, weight] of Object.entries(verifiedWeights)) {
      if (pricesPerKg[category]) {
        totalAmount += weight * pricesPerKg[category];
      }
    }
  }

  // Fallback to purchasePrice if individual weights calculation fails or yields 0
  if (totalAmount === 0 && quotation.purchasePrice > 0) {
    if (bulkRequest.verifiedTotalWeightKg && bulkRequest.estimatedWeightKg > 0) {
      totalAmount = (quotation.purchasePrice / bulkRequest.estimatedWeightKg) * bulkRequest.verifiedTotalWeightKg;
    } else {
      totalAmount = quotation.purchasePrice;
    }
  }

  return { amount: totalAmount, customerId: bulkRequest.businessId };
}
