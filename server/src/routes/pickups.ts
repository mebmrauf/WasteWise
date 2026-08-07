import { Router } from "express";
import { OfferStatus, PickupStatus, VerificationStatus } from "@prisma/client";
import type { PickupRequest, PickupRequestItem, WeightRecord } from "@prisma/client";
import { requireAuth, requireRole } from "../lib/rbac";
import { requireCsrf } from "../lib/csrf";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData, sendError } from "../lib/apiResponse";
import { authorizePickupAccess } from "../lib/pickupAccess";
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
import { createPickupRequestSchema } from "./pickups.schemas";

export const pickupsRouter = Router();

const PICKUP_LIST_LIMIT = 50;

function toPickupSummary(pickup: PickupRequest & { items: PickupRequestItem[] }) {
  return {
    id: pickup.id,
    requesterId: pickup.requesterId,
    assignedCollectorId: pickup.assignedCollectorId,
    items: pickup.items.map((item) => ({
      id: item.id,
      category: item.category,
      loadSize: item.loadSize,
    })),
    timeSlotStart: pickup.timeSlotStart,
    timeSlotEnd: pickup.timeSlotEnd,
    status: pickup.status,
    placeId: pickup.placeId,
    pickupFormattedAddress: pickup.pickupFormattedAddress,
    latitude: pickup.latitude,
    longitude: pickup.longitude,
    createdAt: pickup.createdAt,
    updatedAt: pickup.updatedAt,
  };
}

function toPickupDetail(
  pickup: PickupRequest & { items: PickupRequestItem[] },
  weightRecord: WeightRecord | null,
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
    const { items, timeSlotStart, timeSlotEnd, placeId, formattedAddress, latitude, longitude } = parsed.data;

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

    const { minKg, maxKg } = items.reduce(
      (sum, item) => {
        const range = getLoadSizeKgRange(item.loadSize);
        return { minKg: sum.minKg + range.minKg, maxKg: sum.maxKg + range.maxKg };
      },
      { minKg: 0, maxKg: 0 },
    );

    const pickup = await prisma.pickupRequest.create({
      data: {
        requesterId: req.user!.id,
        items: {
          create: items.map((item) => ({ category: item.category, loadSize: item.loadSize })),
        },
        timeSlotStart: new Date(timeSlotStart),
        timeSlotEnd: new Date(timeSlotEnd),
        placeId,
        pickupFormattedAddress: resolvedAddress.formattedAddress,
        latitude: resolvedAddress.latitude,
        longitude: resolvedAddress.longitude,
        weightRecord: {
          create: {
            estimatedMinKg: minKg,
            estimatedMaxKg: maxKg,
          },
        },
      },
      include: { items: true, weightRecord: true },
    });

    sendData(res, 201, { pickup: toPickupDetail(pickup, pickup.weightRecord) });
  }),
);

pickupsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const pickups = await prisma.pickupRequest.findMany({
      where: { requesterId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: PICKUP_LIST_LIMIT,
      include: { items: true },
    });

    sendData(res, 200, { pickups: pickups.map(toPickupSummary) });
  }),
);

pickupsRouter.get(
  "/open",
  requireAuth,
  requireRole("COLLECTOR"),
  asyncHandler(async (req, res) => {
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

    const pickups = await prisma.pickupRequest.findMany({
      where: { status: PickupStatus.PENDING },
      orderBy: { createdAt: "desc" },
      take: PICKUP_LIST_LIMIT,
      include: { items: true },
    });

    sendData(res, 200, { pickups: pickups.map(toPickupSummary) });
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
        status: { in: [PickupStatus.ASSIGNED, PickupStatus.EN_ROUTE, PickupStatus.ARRIVED] },
      },
      orderBy: { createdAt: "desc" },
      take: PICKUP_LIST_LIMIT,
      include: { items: true },
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

    const [items, weightRecord] = await Promise.all([
      prisma.pickupRequestItem.findMany({
        where: { pickupRequestId: access.pickup.id },
        orderBy: { createdAt: "asc" },
      }),
      prisma.weightRecord.findUnique({
        where: { pickupRequestId: access.pickup.id },
      }),
    ]);

    sendData(res, 200, { pickup: toPickupDetail({ ...access.pickup, items }, weightRecord) });
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

    const [updatedPickup] = await prisma.$transaction([
      prisma.pickupRequest.update({
        where: { id },
        data: { status: PickupStatus.CANCELLED },
        include: { items: true },
      }),
      prisma.pickupTrackingEvent.create({
        data: { pickupRequestId: id, status: PickupStatus.CANCELLED },
      }),
      prisma.offer.updateMany({
        where: { pickupRequestId: id, status: OfferStatus.PENDING },
        data: { status: OfferStatus.REJECTED },
      }),
    ]);

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
          select: { fullName: true, phone: true, avatarUrl: true },
        }),
      ]);
      if (
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
      if (collectorUser) {
        collector = {
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
      where: { pickupRequestId: id },
      orderBy: { createdAt: "desc" },
      take: PICKUP_LIST_LIMIT,
      include: { collector: { include: { collectorProfile: true } } },
    });

    sendData(res, 200, {
      offers: offers.map((offer) => ({
        id: offer.id,
        pickupRequestId: offer.pickupRequestId,
        bidAmount: offer.bidAmount,
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
