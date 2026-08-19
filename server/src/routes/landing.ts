import { Router } from "express";
import { prisma } from "../lib/prisma";
import { sendData, sendError } from "../lib/apiResponse";

const landingRouter = Router();

landingRouter.get("/stats", async (_req, res) => {
  try {
    // 1. Verified Collectors & Companies
    const verifiedCollectorsCount = await prisma.collectorProfile.count({
      where: { verificationStatus: "APPROVED" },
    });

    const recyclingCompaniesCount = await prisma.recyclingCompanyProfile.count({
      where: { verificationStatus: "APPROVED" },
    });

    // 2. Completed Pickups
    const completedPickupsCount = await prisma.pickupRequest.count({
      where: { status: "COMPLETED" },
    });

    const completedBulkPickupsCount = await prisma.bulkMarketplaceRequest.count({
      where: { status: "COMPLETED" },
    });

    const totalCompletedPickups = completedPickupsCount + completedBulkPickupsCount;

    // 3. Total Waste Recycled (Kg)
    // For standard pickups: sum exactWeightKg in PickupRequestItem where parent is COMPLETED
    const standardPickupItems = await prisma.pickupRequestItem.aggregate({
      _sum: { exactWeightKg: true },
      where: {
        pickupRequest: { status: "COMPLETED" },
      },
    });

    // For bulk pickups: sum verifiedTotalWeightKg where status is COMPLETED
    const bulkPickups = await prisma.bulkMarketplaceRequest.aggregate({
      _sum: { verifiedTotalWeightKg: true },
      where: { status: "COMPLETED" },
    });

    const standardWeight = standardPickupItems._sum.exactWeightKg || 0;
    const bulkWeight = bulkPickups._sum.verifiedTotalWeightKg || 0;
    
    const totalWasteRecycled = Math.round(standardWeight + bulkWeight);

    // 4. CO2 Reduced
    // Using an industry standard multiplier: ~1.2 kg CO2 saved per 1 kg of mixed waste recycled
    const co2Reduced = Math.round(totalWasteRecycled * 1.2);

    sendData(res, 200, {
      totalWasteRecycled,
      completedPickups: totalCompletedPickups,
      verifiedCollectors: verifiedCollectorsCount,
      recyclingCompanies: recyclingCompaniesCount,
      co2Reduced,
    });
  } catch (error) {
    console.error("Landing stats error:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to fetch landing stats.");
  }
});

export { landingRouter };
