import { Router } from "express";
import { OfferStatus, PickupStatus, VerificationStatus } from "@prisma/client";
import type { PickupRequest, PickupRequestItem, WeightRecord } from "@prisma/client";
import { requireAuth, requireRole } from "../lib/rbac";
import { requireCsrf } from "../lib/csrf";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData, sendError } from "../lib/apiResponse";
import { authorizePickupAccess } from "../lib/pickupAccess";
import { createNotification } from "../lib/notifications";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import {
  GeocodingResolutionError,
  isGeocodingConfigured,
  resolveAddressFromPlaceId,
} from "../lib/geocoding";
import { getLoadSizeKgRange } from "../lib/loadSize";
import { emitToRoom } from "../realtime/emitToRoom";
import { PICKUP_STATUS_EVENT } from "../realtime/pickupEvents";
import { computeRecyclingReminder } from "../lib/recyclingPattern";
import { isWithinRadiusKm, distanceKm, MAX_COLLECTOR_MATCH_DISTANCE_KM } from "../lib/geoDistance";
import { createPickupRequestSchema, ratePickupSchema } from "./pickups.schemas";


async function autoCancelExpiredPickups() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  
  await prisma.pickupRequest.updateMany({
    where: {
      status: PickupStatus.PENDING,
      pickupDate: { lt: startOfToday }
    },
    data: {
      status: PickupStatus.CANCELLED
    }
  });
}

export const pickupsRouter = Router();

const PICKUP_LIST_LIMIT = 50;

export function toPickupSummary(pickup: PickupRequest & { items: PickupRequestItem[], offers?: { status: string; bidAmountsPerKg: any }[], rating?: any, weightRecord?: { estimatedMinKg: number; estimatedMaxKg: number } | null, requester?: { fullName: string; phone: string | null; avatarUrl: string | null } | null, payments?: any[] }) {
  const acceptedOffer = pickup.offers?.find(o => o.status === "ACCEPTED");
  return {
    id: pickup.id,
    requesterId: pickup.requesterId,
    assignedCollectorId: pickup.assignedCollectorId,
    items: pickup.items.map((item) => ({
      id: item.id,
      category: item.category,
      loadSize: item.loadSize,
      exactWeightKg: item.exactWeightKg,
    })),
    pickupDate: pickup.pickupDate,
    status: pickup.status,
    placeId: pickup.placeId,
    pickupFormattedAddress: pickup.pickupFormattedAddress,
    latitude: pickup.latitude,
    longitude: pickup.longitude,
    serviceArea: pickup.serviceArea,
    preferredCollectorId: pickup.preferredCollectorId,
    isExclusiveToPreferred: pickup.isExclusiveToPreferred,
    isBulk: pickup.isBulk,
    bidAmountsPerKg: acceptedOffer?.bidAmountsPerKg ?? null,
    hasRating: !!pickup.rating,
    estimatedMinKg: pickup.weightRecord?.estimatedMinKg ?? null,
    estimatedMaxKg: pickup.weightRecord?.estimatedMaxKg ?? null,
    hasPayment: pickup.payments ? pickup.payments.length > 0 : false,
    createdAt: pickup.createdAt,
    updatedAt: pickup.updatedAt,
    requester: pickup.requester
      ? {
          fullName: pickup.requester.fullName,
          phone: pickup.requester.phone,
          avatarUrl: pickup.requester.avatarUrl,
        }
      : null,
  };
}

function toPickupDetail(
  pickup: PickupRequest & { items: PickupRequestItem[], offers?: { status: string; bidAmountsPerKg: any }[], payments?: any[] },
  weightRecord: WeightRecord | null,
  rating?: { score: number; comment: string | null; createdAt: Date } | null,
  pointsEarned?: number | null,
) {
  return {
    ...toPickupSummary(pickup),
    weightRecord: weightRecord
      ? {
          estimatedMinKg: weightRecord.estimatedMinKg,
          estimatedMaxKg: weightRecord.estimatedMaxKg,
          exactWeightKg: weightRecord.exactWeightKg,
          loggedAt: weightRecord.loggedAt,
        }
      : null,
    rating: rating
      ? {
          score: rating.score,
          comment: rating.comment,
          createdAt: rating.createdAt,
        }
      : null,
    pointsEarned: pointsEarned ?? null,
  };
}

pickupsRouter.post(
  "/",
  requireAuth,
  requireRole("USER"),
  requireCsrf,
  asyncHandler(async (req, res) => {
    const parsed = createPickupRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    const { items, pickupDate, placeId, formattedAddress, latitude, longitude, serviceArea, preferredCollectorId, isExclusiveToPreferred, isBulk, estimatedTotalWeight } = parsed.data;

    if (isBulk) {
      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      if (!user || user.accountType !== "BUSINESS") {
        sendError(res, 403, "FORBIDDEN", "Only Business accounts can create Bulk Pickups.");
        return;
      }
    }

    let resolvedAddress: { formattedAddress: string; latitude: number | null; longitude: number | null };

    if (formattedAddress && latitude !== undefined && longitude !== undefined) {
      resolvedAddress = { formattedAddress, latitude, longitude };
    } else {
      // Fallback
      if (!isGeocodingConfigured()) {
        sendError(
          res,
          503,
          "GEOCODING_NOT_CONFIGURED",
          "Address lookup is currently unavailable. Please try again later.",
        );
        return;
      }

      try {
        resolvedAddress = await resolveAddressFromPlaceId(placeId);
      } catch (err) {
        if (err instanceof GeocodingResolutionError) {
          if (err.details.type === "not_found") {
            sendError(
              res,
              400,
              "VALIDATION_ERROR",
              "That address could not be found — try selecting a suggestion from the list again.",
            );
            return;
          }
          logger.error({ err: err.details }, "Geocoding upstream failure during pickup request");
          sendError(
            res,
            502,
            "GEOCODING_FAILED",
            "We couldn't verify that address right now. Please try again shortly.",
          );
          return;
        }
        throw err;
      }
    }

    let minKg = 0;
    let maxKg = 0;

    if (estimatedTotalWeight !== undefined) {
      minKg = estimatedTotalWeight;
      maxKg = estimatedTotalWeight;
    } else {
      const calc = items.reduce(
        (sum, item) => {
          const range = getLoadSizeKgRange(item.loadSize);
          return { minKg: sum.minKg + range.minKg, maxKg: sum.maxKg + range.maxKg };
        },
        { minKg: 0, maxKg: 0 },
      );
      minKg = calc.minKg;
      maxKg = calc.maxKg;
    }

    const pickup = await prisma.pickupRequest.create({
      data: {
        requesterId: req.user!.id,
        items: {
          create: items.map((item) => ({ category: item.category, loadSize: item.loadSize })),
        },
        pickupDate: new Date(pickupDate),
        placeId,
        pickupFormattedAddress: resolvedAddress.formattedAddress,
        latitude: resolvedAddress.latitude,
        longitude: resolvedAddress.longitude,
        serviceArea,
        preferredCollectorId,
        isExclusiveToPreferred,
        isBulk,
        weightRecord: {
          create: {
            estimatedMinKg: minKg,
            estimatedMaxKg: maxKg,
          },
        },
      },
      include: { items: true, weightRecord: true, offers: { where: { status: OfferStatus.ACCEPTED } } },
    });

    // Notify verified collectors whose service radius covers this pickup.
    if (resolvedAddress.latitude !== null && resolvedAddress.longitude !== null) {
      const pickupLocation = { lat: resolvedAddress.latitude, lng: resolvedAddress.longitude };

      const candidateCollectors = await prisma.collectorProfile.findMany({
        where: {
          verificationStatus: VerificationStatus.APPROVED,
          serviceAreaLatitude: { not: null },
          serviceAreaLongitude: { not: null },
          serviceAreaRadiusKm: { not: null },
        },
        select: { userId: true, serviceAreaLatitude: true, serviceAreaLongitude: true, serviceAreaRadiusKm: true },
      });

      for (const collector of candidateCollectors) {
        const isInRange = isWithinRadiusKm(
          pickupLocation,
          { lat: collector.serviceAreaLatitude as number, lng: collector.serviceAreaLongitude as number },
          Math.min(collector.serviceAreaRadiusKm as number, MAX_COLLECTOR_MATCH_DISTANCE_KM),
        );
        if (!isInRange) continue;

        void createNotification({
          userId: collector.userId,
          type: "GENERIC",
          title: "New Pickup Request Near You",
          message: `A household requested a pickup at ${resolvedAddress.formattedAddress}, within your service area.`,
          relatedPickupRequestId: pickup.id,
        });
      }
    }

    sendData(res, 201, { pickup: toPickupDetail(pickup, pickup.weightRecord) });
  }),
);

pickupsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    await autoCancelExpiredPickups();

    const pickups = await prisma.pickupRequest.findMany({
      where: { requesterId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: PICKUP_LIST_LIMIT,
      include: { items: true, offers: { where: { status: OfferStatus.ACCEPTED } }, rating: true, weightRecord: true, requester: { select: { fullName: true, phone: true, avatarUrl: true } }, payments: { where: { status: "COMPLETED" }, select: { id: true } } },
    });

    sendData(res, 200, { pickups: pickups.map(toPickupSummary) });
  }),
);

pickupsRouter.get(
  "/reminders/summary",
  requireAuth,
  requireRole("USER"),
  asyncHandler(async (req, res) => {
    const completedPickups = await prisma.pickupRequest.findMany({
      where: { requesterId: req.user!.id, status: PickupStatus.COMPLETED },
      select: { updatedAt: true },
      orderBy: { updatedAt: "asc" },
    });

    const reminder = computeRecyclingReminder(completedPickups.map((p) => p.updatedAt));

    sendData(res, 200, {
      hasPattern: reminder.hasPattern,
      averageIntervalDays: reminder.averageIntervalDays,
      lastPickupDate: reminder.lastPickupDate,
      daysSinceLastPickup: reminder.daysSinceLastPickup,
      isDue: reminder.isDue,
      message: reminder.message,
    });
  }),
);

pickupsRouter.get(
  "/open",
  requireAuth,
  requireRole("COLLECTOR"),
  asyncHandler(async (req, res) => {
    await autoCancelExpiredPickups();

    const collectorProfile = await prisma.collectorProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (collectorProfile?.verificationStatus !== VerificationStatus.APPROVED) {
      sendError(
        res,
        403,
        "COLLECTOR_NOT_VERIFIED",
        "Your collector account must be verified before you can view open pickup requests.",
      );
      return;
    }
    
    if (!collectorProfile?.serviceArea) {
      sendError(
        res,
        403,
        "COLLECTOR_SERVICE_AREA_MISSING",
        "You must select a service area in your profile to view open pickup requests.",
      );
      return;
    }

    const pickups = await prisma.pickupRequest.findMany({
      where: {
        status: PickupStatus.PENDING,
        ignoredByCollectors: { none: { id: req.user!.id } },
        isBulk: false,
        OR: [
          { isExclusiveToPreferred: false },
          { preferredCollectorId: req.user!.id }
        ]
      },
      include: { items: true, offers: { where: { status: OfferStatus.ACCEPTED } }, weightRecord: true, requester: { select: { fullName: true, phone: true, avatarUrl: true } } },
    });
    
    console.log(`[GET /open] Found ${pickups.length} PENDING pickups for collector ${req.user!.id}`);

    // A collector 100km away can't realistically make the trip — cap browsing
    // to the same hard distance limit used for notification matching, even if
    // the collector configured a larger self-service radius. Collectors who
    // haven't set a geocoded service point yet fall back to unfiltered.
    const hasServiceArea =
      collectorProfile.serviceAreaLatitude !== null &&
      collectorProfile.serviceAreaLongitude !== null &&
      collectorProfile.serviceAreaRadiusKm !== null;

    const collectorCenter = hasServiceArea ? { lat: collectorProfile.serviceAreaLatitude as number, lng: collectorProfile.serviceAreaLongitude as number } : null;
    const maxRadius = hasServiceArea ? Math.min(collectorProfile.serviceAreaRadiusKm as number, MAX_COLLECTOR_MATCH_DISTANCE_KM) : Infinity;

    const pickupsWithDistance = pickups.map(pickup => {
      let dist = Infinity;
      if (hasServiceArea && pickup.latitude !== null && pickup.longitude !== null) {
        dist = distanceKm({ lat: pickup.latitude, lng: pickup.longitude }, collectorCenter!);
      }
      return { pickup, dist };
    });

    const nearbyPickups = pickupsWithDistance.filter(p => {
      if (!hasServiceArea) return true;
      if (p.pickup.latitude === null || p.pickup.longitude === null) return false;
      return p.dist <= maxRadius;
    });

    nearbyPickups.sort((a, b) => {
      const dateA = a.pickup.pickupDate.getTime();
      const dateB = b.pickup.pickupDate.getTime();
      if (dateA !== dateB) return dateA - dateB;
      return a.dist - b.dist;
    });

    sendData(res, 200, { pickups: nearbyPickups.map(p => toPickupSummary(p.pickup)).slice(0, PICKUP_LIST_LIMIT) });
    console.log(`[GET /open] Filtered to ${nearbyPickups.length} nearby pickups`);
  }),
);

pickupsRouter.get(
  "/assigned",
  requireAuth,
  requireRole("COLLECTOR"),
  asyncHandler(async (req, res) => {
    const pickups = await prisma.pickupRequest.findMany({
      where: {
        assignedCollectorId: req.user!.id,
        isBulk: false,
        status: { in: [PickupStatus.ASSIGNED, PickupStatus.EN_ROUTE, PickupStatus.ARRIVED, PickupStatus.VERIFYING_WEIGHTS] },
      },
      orderBy: { createdAt: "desc" },
      take: PICKUP_LIST_LIMIT,
      include: { items: true, offers: { where: { status: OfferStatus.ACCEPTED } }, weightRecord: true, requester: { select: { fullName: true, phone: true, avatarUrl: true } } },
    });

    sendData(res, 200, { pickups: pickups.map(toPickupSummary) });
  }),
);

pickupsRouter.get(
  "/collector-history",
  requireAuth,
  requireRole("COLLECTOR"),
  asyncHandler(async (req, res) => {
    const pickups = await prisma.pickupRequest.findMany({
      where: {
        assignedCollectorId: req.user!.id,
        isBulk: false,
        status: PickupStatus.COMPLETED,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { items: true, offers: { where: { status: OfferStatus.ACCEPTED } }, rating: true, weightRecord: true, requester: { select: { fullName: true, phone: true, avatarUrl: true } }, payments: { where: { status: "COMPLETED" }, select: { id: true } } },
    });

    sendData(res, 200, { pickups: pickups.map(toPickupSummary) });
  }),
);

pickupsRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const access = await authorizePickupAccess(req.user!.id, id);
    if (!access.ok) {
      if (access.reason === "not_found") {
        sendError(res, 404, "NOT_FOUND", "Pickup not found.");
        return;
      }
      sendError(res, 403, "FORBIDDEN", "You are not authorized to view this pickup.");
      return;
    }

    const [items, weightRecord, offers, rating, pointsTxn] = await Promise.all([
      prisma.pickupRequestItem.findMany({
        where: { pickupRequestId: access.pickup.id },
        orderBy: { createdAt: "asc" },
      }),
      prisma.weightRecord.findUnique({
        where: { pickupRequestId: access.pickup.id },
      }),
      prisma.offer.findMany({
        where: { pickupRequestId: access.pickup.id, status: OfferStatus.ACCEPTED },
      }),
      prisma.rating.findUnique({
        where: { pickupRequestId: access.pickup.id },
      }),
      prisma.greenPointsTransaction.findFirst({
        where: { pickupRequestId: access.pickup.id },
      }),
    ]);

    sendData(res, 200, { pickup: toPickupDetail({ ...access.pickup, items, offers }, weightRecord, rating, pointsTxn?.points ?? null) });
  }),
);

pickupsRouter.post(
  "/:id/cancel",
  requireAuth,
  requireCsrf,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const access = await authorizePickupAccess(req.user!.id, id);
    if (!access.ok) {
      if (access.reason === "not_found") {
        sendError(res, 404, "NOT_FOUND", "Pickup not found.");
        return;
      }
      sendError(res, 403, "FORBIDDEN", "You are not authorized to cancel this pickup.");
      return;
    }
    if (access.role !== "requester") {
      sendError(res, 403, "FORBIDDEN", "Only the requester can cancel this pickup.");
      return;
    }
    if (access.pickup.status !== PickupStatus.PENDING) {
      sendError(
        res,
        409,
        "INVALID_STATUS_TRANSITION",
        `This pickup can no longer be cancelled (current status: ${access.pickup.status}).`,
      );
      return;
    }
    // Grab pending bidders *before* the transaction rejects them, so we know
    // who to notify that their offer fell through.
    const pendingOffers = await prisma.offer.findMany({
      where: { pickupRequestId: id, status: OfferStatus.PENDING },
      select: { collectorId: true },
    });

    const [updatedPickup] = await prisma.$transaction([
      prisma.pickupRequest.update({
        where: { id },
        data: { status: PickupStatus.CANCELLED },
        include: { items: true, offers: { where: { status: OfferStatus.ACCEPTED } } },
      }),
      prisma.pickupTrackingEvent.create({
        data: { pickupRequestId: id, status: PickupStatus.CANCELLED },
      }),
      prisma.offer.updateMany({
        where: { pickupRequestId: id, status: OfferStatus.PENDING },
        data: { status: OfferStatus.REJECTED },
      }),
    ]);

    for (const { collectorId } of pendingOffers) {
      void createNotification({
        userId: collectorId,
        type: "PICKUP_STATUS_UPDATE",
        title: "Pickup Request Cancelled",
        message: "The household cancelled this pickup request, so your offer is no longer active.",
        relatedPickupRequestId: id,
      });
    }

    try {
      emitToRoom(id, PICKUP_STATUS_EVENT, {
        pickupRequestId: id,
        status: updatedPickup.status,
        createdAt: updatedPickup.updatedAt,
      });
    } catch (err) {
      logger.debug({ err, pickupRequestId: id }, "Skipped real-time broadcast for REST pickup cancel");
    }

    sendData(res, 200, { pickup: toPickupSummary(updatedPickup) });
  }),
);

pickupsRouter.get(
  "/:id/tracking",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const access = await authorizePickupAccess(req.user!.id, id);
    if (!access.ok) {
      if (access.reason === "not_found") {
        sendError(res, 404, "NOT_FOUND", "Pickup not found.");
        return;
      }
      sendError(res, 403, "FORBIDDEN", "You are not authorized to track this pickup.");
      return;
    }

    let collectorLocation: { lat: number; lng: number; updatedAt: Date } | null = null;
    let collector: {
      id: string;
      fullName: string;
      phone: string | null;
      vehicleType: string | null;
      avatarUrl: string | null;
    } | null = null;
    if (access.pickup.assignedCollectorId) {
      const [collectorProfile, collectorUser] = await Promise.all([
        prisma.collectorProfile.findUnique({
          where: { userId: access.pickup.assignedCollectorId },
        }),
        prisma.user.findUnique({
          where: { id: access.pickup.assignedCollectorId },
          select: { id: true, fullName: true, phone: true, avatarUrl: true },
        }),
      ]);
      const isCollectorApproved = collectorProfile?.verificationStatus === VerificationStatus.APPROVED;

      if (
        isCollectorApproved &&
        collectorProfile?.lastKnownLatitude != null &&
        collectorProfile?.lastKnownLongitude != null &&
        collectorProfile?.lastLocationUpdatedAt != null
      ) {
        collectorLocation = {
          lat: collectorProfile.lastKnownLatitude,
          lng: collectorProfile.lastKnownLongitude,
          updatedAt: collectorProfile.lastLocationUpdatedAt,
        };
      }
      if (isCollectorApproved && collectorUser) {
        collector = {
          id: collectorUser.id,
          fullName: collectorUser.fullName,
          phone: collectorUser.phone,
          vehicleType: collectorProfile?.vehicleType ?? null,
          avatarUrl: collectorUser.avatarUrl,
        };
      }
    }

    sendData(res, 200, {
      pickupRequestId: access.pickup.id,
      status: access.pickup.status,
      pickupLocation: {
        lat: access.pickup.latitude,
        lng: access.pickup.longitude,
      },
      collectorLocation,
      collector,
    });
  }),
);

pickupsRouter.get(
  "/:id/offers",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const pickup = await prisma.pickupRequest.findUnique({ where: { id } });
    if (!pickup) {
      sendError(res, 404, "NOT_FOUND", "Pickup not found.");
      return;
    }
    if (pickup.requesterId !== req.user!.id) {
      sendError(res, 403, "FORBIDDEN", "Only the requester can view offers on this pickup.");
      return;
    }

    const offers = await prisma.offer.findMany({
      where: {
        pickupRequestId: id,
        collector: { collectorProfile: { verificationStatus: VerificationStatus.APPROVED } },
      },
      orderBy: { createdAt: "desc" },
      take: PICKUP_LIST_LIMIT,
      include: { collector: { include: { collectorProfile: true } } },
    });

    sendData(res, 200, {
      offers: offers.map((offer) => ({
        id: offer.id,
        pickupRequestId: offer.pickupRequestId,
        bidAmount: offer.bidAmount,
        bidAmountsPerKg: offer.bidAmountsPerKg as Record<string, number> | null,
        message: offer.message,
        status: offer.status,
        createdAt: offer.createdAt,
        updatedAt: offer.updatedAt,
        collector: {
          id: offer.collector.id,
          fullName: offer.collector.fullName,
          vehicleType: offer.collector.collectorProfile?.vehicleType ?? null,
          avatarUrl: offer.collector.avatarUrl,
        },
      })),
    });
  }),
);

pickupsRouter.post(
  "/:id/rate",
  requireAuth,
  requireRole("USER"),
  requireCsrf,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const parsed = ratePickupSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    const { score, comment } = parsed.data;

    const pickup = await prisma.pickupRequest.findUnique({ where: { id } });
    if (!pickup) {
      sendError(res, 404, "NOT_FOUND", "Pickup not found.");
      return;
    }
    if (pickup.requesterId !== req.user!.id) {
      sendError(res, 403, "FORBIDDEN", "Only the requester can rate this pickup.");
      return;
    }
    if (pickup.status !== PickupStatus.COMPLETED) {
      sendError(res, 400, "INVALID_STATUS", "You can only rate a completed pickup.");
      return;
    }
    if (!pickup.assignedCollectorId) {
      sendError(res, 400, "NO_COLLECTOR", "No collector was assigned to this pickup.");
      return;
    }

    const existingRating = await prisma.rating.findUnique({ where: { pickupRequestId: id } });
    if (existingRating) {
      sendError(res, 409, "ALREADY_RATED", "You have already rated this pickup.");
      return;
    }

    const assignedCollectorId = pickup.assignedCollectorId;
    
    await prisma.$transaction(async (tx) => {
      await tx.rating.create({
        data: {
          pickupRequestId: id,
          raterId: req.user!.id,
          collectorId: assignedCollectorId,
          score,
          comment,
        },
      });

      const profile = await tx.collectorProfile.findUnique({
        where: { userId: assignedCollectorId },
      });
      if (profile) {
        const oldTotal = profile.totalRatings;
        const oldAvg = profile.averageRating ?? 0;
        const newTotal = oldTotal + 1;
        const newAvg = ((oldAvg * oldTotal) + score) / newTotal;

        await tx.collectorProfile.update({
          where: { userId: assignedCollectorId },
          data: {
            totalRatings: newTotal,
            averageRating: newAvg,
          },
        });
      }
    });

    sendData(res, 201, { success: true });
  }),
);

pickupsRouter.post(
  "/:id/ignore",
  requireAuth,
  requireRole("COLLECTOR"),
  requireCsrf,
  asyncHandler(async (req, res) => {
    const pickupId = req.params.id;

    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ignoredPickups: {
          connect: { id: pickupId },
        },
      },
    });

    sendData(res, 200, { success: true });
  }),
);
