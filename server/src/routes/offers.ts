import { Router } from "express";
import { OfferStatus, PickupStatus, Prisma, VerificationStatus } from "@prisma/client";
import type { Offer } from "@prisma/client";
import { requireAuth, requireRole } from "../lib/rbac";
import { requireCsrf } from "../lib/csrf";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData, sendError } from "../lib/apiResponse";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { createNotification } from "../lib/notifications";
import { attachPickupToActiveRouteIfAny } from "../lib/routeService";
import { emitToRoom } from "../realtime/emitToRoom";
import { PICKUP_STATUS_EVENT } from "../realtime/pickupEvents";
import { submitOfferSchema } from "./offers.schemas";

export const offersRouter = Router();

function toOfferSummary(offer: Offer) {
  return {
    id: offer.id,
    pickupRequestId: offer.pickupRequestId,
    collectorId: offer.collectorId,
    bidAmount: offer.bidAmount,
    bidAmountsPerKg: offer.bidAmountsPerKg as Record<string, number> | null,
    message: offer.message,
    status: offer.status,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
  };
}

offersRouter.post(
  "/",
  requireAuth,
  requireRole("COLLECTOR"),
  requireCsrf,
  asyncHandler(async (req, res) => {
    const parsed = submitOfferSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    const { pickupRequestId, bidAmount, bidAmountsPerKg, message } = parsed.data;

    const collectorProfile = await prisma.collectorProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (collectorProfile?.verificationStatus !== VerificationStatus.APPROVED) {
      sendError(
        res,
        403,
        "COLLECTOR_NOT_VERIFIED",
        "Your collector account must be verified before you can submit an offer.",
      );
      return;
    }

    const pickup = await prisma.pickupRequest.findUnique({ where: { id: pickupRequestId } });
    if (!pickup) {
      sendError(res, 404, "NOT_FOUND", "Pickup not found.");
      return;
    }
    if (pickup.status !== PickupStatus.PENDING) {
      sendError(
        res,
        409,
        "PICKUP_NOT_OPEN",
        `This pickup is no longer open for offers (current status: ${pickup.status}).`,
      );
      return;
    }

    let offer: Offer;
    try {
      offer = await prisma.offer.create({
        data: {
          pickupRequestId,
          collectorId: req.user!.id,
          bidAmount,
          bidAmountsPerKg,
          message,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        sendError(
          res,
          409,
          "OFFER_ALREADY_EXISTS",
          "You have already submitted an offer on this pickup.",
        );
        return;
      }
      throw err;
    }
    
    // Notify the requester about the new offer
    void createNotification({
      userId: pickup.requesterId,
      type: "OFFER_RECEIVED",
      title: "New Offer Received",
      message: `A collector has submitted a new bid on your pickup request.`,
      relatedPickupRequestId: pickup.id,
      emailPreference: "emailNotificationsEnabled",
    });

    sendData(res, 201, { offer: toOfferSummary(offer) });
  }),
);

offersRouter.post(
  "/:offerId/accept",
  requireAuth,
  requireCsrf,
  asyncHandler(async (req, res) => {
    const { offerId } = req.params;

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { pickupRequest: true },
    });
    if (!offer) {
      sendError(res, 404, "NOT_FOUND", "Offer not found.");
      return;
    }
    if (offer.pickupRequest.requesterId !== req.user!.id) {
      sendError(res, 403, "FORBIDDEN", "Only the request's owner can accept an offer on it.");
      return;
    }
    if (offer.pickupRequest.status !== PickupStatus.PENDING) {
      sendError(
        res,
        409,
        "PICKUP_NOT_OPEN",
        `This pickup is no longer open for offers (current status: ${offer.pickupRequest.status}).`,
      );
      return;
    }
    if (offer.status !== OfferStatus.PENDING) {
      sendError(res, 409, "OFFER_NOT_PENDING", "This offer is no longer pending.");
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.pickupRequest.updateMany({
        where: { id: offer.pickupRequestId, status: PickupStatus.PENDING },
        data: { status: PickupStatus.ASSIGNED, assignedCollectorId: offer.collectorId },
      });
      if (claimed.count === 0) {
        return null;
      }

      // Grab the other pending bidders *before* rejecting them, so we know
      // who to notify that they didn't get this pickup.
      const otherPendingOffers = await tx.offer.findMany({
        where: {
          pickupRequestId: offer.pickupRequestId,
          id: { not: offer.id },
          status: OfferStatus.PENDING,
        },
        select: { collectorId: true },
      });

      const acceptedOffer = await tx.offer.update({
        where: { id: offer.id },
        data: { status: OfferStatus.ACCEPTED },
      });
      await tx.offer.updateMany({
        where: {
          pickupRequestId: offer.pickupRequestId,
          id: { not: offer.id },
          status: OfferStatus.PENDING,
        },
        data: { status: OfferStatus.REJECTED },
      });
      await tx.pickupTrackingEvent.create({
        data: { pickupRequestId: offer.pickupRequestId, status: PickupStatus.ASSIGNED },
      });
      const updatedPickup = await tx.pickupRequest.findUniqueOrThrow({
        where: { id: offer.pickupRequestId },
      });

      return { offer: acceptedOffer, pickup: updatedPickup, rejectedCollectorIds: otherPendingOffers.map((o: { collectorId: string }) => o.collectorId) };
    });

    if (!result) {
      sendError(
        res,
        409,
        "PICKUP_NOT_OPEN",
        "This pickup was already assigned to another collector.",
      );
      return;
    }

    try {
      emitToRoom(offer.pickupRequestId, PICKUP_STATUS_EVENT, {
        pickupRequestId: offer.pickupRequestId,
        status: result.pickup.status,
        createdAt: result.pickup.updatedAt,
      });
    } catch (err) {
      logger.debug(
        { err, pickupRequestId: offer.pickupRequestId },
        "Skipped real-time broadcast for REST offer accept",
      );
    }
    
    void attachPickupToActiveRouteIfAny(offer.collectorId, offer.pickupRequestId);

    // Notify the collector that their offer was accepted
    void createNotification({
      userId: offer.collectorId,
      type: "PICKUP_STATUS_UPDATE",
      title: "Offer Accepted!",
      message: `Your bid for the pickup request has been accepted. You have been assigned the pickup.`,
      relatedPickupRequestId: offer.pickupRequestId,
      emailPreference: "emailNotificationsEnabled",
    });

    // Notify the other bidders that they didn't get this one
    for (const collectorId of result.rejectedCollectorIds) {
      void createNotification({
        userId: collectorId,
        type: "GENERIC",
        title: "Offer Not Selected",
        message: "The household chose another collector for this pickup request.",
        relatedPickupRequestId: offer.pickupRequestId,
      });
    }

    sendData(res, 200, {
      offer: toOfferSummary(result.offer),
      pickup: {
        id: result.pickup.id,
        status: result.pickup.status,
        assignedCollectorId: result.pickup.assignedCollectorId,
        updatedAt: result.pickup.updatedAt,
      },
    });
  }),
);
