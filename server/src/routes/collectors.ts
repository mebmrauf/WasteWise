import { Router } from "express";
import { prisma } from "../lib/prisma";
import { getVerifiedCollectorsSchema } from "./collectors.schemas";
import { sendError, sendData } from "../lib/apiResponse";
import { distanceKm } from "../lib/geoDistance";

export const collectorsRouter = Router();

const SEARCH_RADIUS_KM = 20;

collectorsRouter.get("/", async (req, res) => {
  const parsed = getVerifiedCollectorsSchema.safeParse(req.query);
  if (!parsed.success) {
    return sendError(res, 400, "VALIDATION_ERROR", parsed.error.message);
  }

  const { vehicleType, latitude, longitude, minRating, sortBy } = parsed.data;
  const hasLocation = latitude !== undefined && longitude !== undefined;

  const collectors = await prisma.user.findMany({
    where: {
      role: "COLLECTOR",
      collectorProfile: {
        verificationStatus: "APPROVED",
        ...(vehicleType ? { vehicleType } : {}),
      },
    },
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      phone: true,
      collectorProfile: {
        select: {
          averageRating: true,
          totalRatings: true,
          vehicleType: true,
          serviceArea: true,
          serviceAreaLatitude: true,
          serviceAreaLongitude: true,
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
    .map((c) => {
      const profile = c.collectorProfile!;
      const distance =
        hasLocation && profile.serviceAreaLatitude !== null && profile.serviceAreaLongitude !== null
          ? distanceKm(
              { lat: latitude!, lng: longitude! },
              { lat: profile.serviceAreaLatitude, lng: profile.serviceAreaLongitude },
            )
          : null;
      return {
        id: c.id,
        fullName: c.fullName,
        avatarUrl: c.avatarUrl,
        phone: c.phone,
        averageRating: profile.averageRating,
        totalRatings: profile.totalRatings,
        vehicleType: profile.vehicleType,
        serviceArea: profile.serviceArea,
        distanceKm: distance,
      };
    })
    .filter((c) => !hasLocation || (c.distanceKm !== null && c.distanceKm <= SEARCH_RADIUS_KM))
    .filter((c) => minRating === undefined || (c.averageRating !== null && c.averageRating >= minRating))
    .sort((a, b) => {
      if (sortBy === "rating") return (b.averageRating ?? 0) - (a.averageRating ?? 0);
      if (hasLocation) return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
      return (b.averageRating ?? 0) - (a.averageRating ?? 0);
    });

  return sendData(res, 200, directory);
});
