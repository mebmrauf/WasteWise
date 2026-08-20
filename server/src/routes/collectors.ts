import { Router } from "express";
import { prisma } from "../lib/prisma";
import { getVerifiedCollectorsSchema } from "./collectors.schemas";
import { sendError, sendData } from "../lib/apiResponse";
import { distanceKm, MAX_COLLECTOR_MATCH_DISTANCE_KM } from "../lib/geoDistance";

export const collectorsRouter = Router();

collectorsRouter.get("/", async (req, res) => {
  const parsed = getVerifiedCollectorsSchema.safeParse(req.query);
  if (!parsed.success) {
    return sendError(res, 400, "VALIDATION_ERROR", parsed.error.message);
  }

  const { serviceArea, vehicleType, lat, lng, minRating, sort } = parsed.data;

  const collectors = await prisma.user.findMany({
    where: {
      role: "COLLECTOR",
      collectorProfile: {
        verificationStatus: "APPROVED",
        ...(serviceArea ? { serviceArea } : {}),
        ...(vehicleType ? { vehicleType } : {}),
        ...(minRating ? { averageRating: { gte: minRating } } : {}),
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
          serviceAreaFormattedAddress: true,
          serviceAreaLatitude: true,
          serviceAreaLongitude: true,
        },
      },
    },
  });

  // Flatten the response
  let directory = collectors
    .filter((c) => c.collectorProfile) // Just in case
    .map((c) => {
      const profile = c.collectorProfile!;
      const distance =
        lat !== undefined &&
        lng !== undefined &&
        profile.serviceAreaLatitude !== null &&
        profile.serviceAreaLongitude !== null
          ? distanceKm({ lat, lng }, { lat: profile.serviceAreaLatitude, lng: profile.serviceAreaLongitude })
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
        serviceAreaFormattedAddress: profile.serviceAreaFormattedAddress,
        hasServiceLocation: profile.serviceAreaLatitude !== null && profile.serviceAreaLongitude !== null,
        distanceKm: distance,
      };
    });

  if (lat !== undefined && lng !== undefined) {
    directory = directory
      .filter((c) => c.hasServiceLocation)
      .filter((c) => c.distanceKm !== null && c.distanceKm <= MAX_COLLECTOR_MATCH_DISTANCE_KM);
  }

  directory.sort((a, b) => {
    if (sort === "rating" || a.distanceKm === null || b.distanceKm === null) {
      return (b.averageRating ?? 0) - (a.averageRating ?? 0);
    }
    return a.distanceKm - b.distanceKm;
  });

  const response = directory.map((c) => ({
    id: c.id,
    fullName: c.fullName,
    avatarUrl: c.avatarUrl,
    phone: c.phone,
    averageRating: c.averageRating,
    totalRatings: c.totalRatings,
    vehicleType: c.vehicleType,
    serviceArea: c.serviceArea,
    serviceAreaFormattedAddress: c.serviceAreaFormattedAddress,
    distanceKm: c.distanceKm,
  }));

  return sendData(res, 200, response);
});
