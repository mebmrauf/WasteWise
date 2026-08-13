import { Router } from "express";
import { prisma } from "../lib/prisma";
import { getVerifiedCollectorsSchema } from "./collectors.schemas";
import { sendError, sendData } from "../lib/apiResponse";

export const collectorsRouter = Router();

collectorsRouter.get("/", async (req, res) => {
  const parsed = getVerifiedCollectorsSchema.safeParse(req.query);
  if (!parsed.success) {
    return sendError(res, 400, "VALIDATION_ERROR", parsed.error.message);
  }

  const { serviceArea, vehicleType } = parsed.data;

  const collectors = await prisma.user.findMany({
    where: {
      role: "COLLECTOR",
      collectorProfile: {
        verificationStatus: "APPROVED",
        ...(serviceArea ? { serviceArea } : {}),
        ...(vehicleType ? { vehicleType } : {}),
      },
    },
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      collectorProfile: {
        select: {
          averageRating: true,
          totalRatings: true,
          vehicleType: true,
          serviceArea: true,
        },
      },
    },
    orderBy: {
      collectorProfile: {
        averageRating: "desc", // Sort by rating descending
      }
    }
  });

  // Flatten the response
  const directory = collectors
    .filter((c) => c.collectorProfile) // Just in case
    .map((c) => ({
      id: c.id,
      fullName: c.fullName,
      avatarUrl: c.avatarUrl,
      averageRating: c.collectorProfile!.averageRating,
      totalRatings: c.collectorProfile!.totalRatings,
      vehicleType: c.collectorProfile!.vehicleType,
      serviceArea: c.collectorProfile!.serviceArea,
    }));

  return sendData(res, 200, directory);
});
