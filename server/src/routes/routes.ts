import { Router } from "express";
import { OfferStatus, VerificationStatus } from "@prisma/client";
import { requireAuth, requireRole } from "../lib/rbac";
import { requireCsrf } from "../lib/csrf";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData, sendError } from "../lib/apiResponse";
import { prisma } from "../lib/prisma";
import {
  getSuggestedRoute,
  startRoute,
  skipStop,
  getActiveRoute,
} from "../lib/routeService";
import { toPickupSummary } from "./pickups";
import { startRouteSchema } from "./routes.schemas";

export const routesRouter = Router();

async function requireVerifiedCollector(userId: string) {
  const profile = await prisma.collectorProfile.findUnique({ where: { userId } });
  return profile?.verificationStatus === VerificationStatus.APPROVED;
}

routesRouter.get(
  "/suggested",
  requireAuth,
  requireRole("COLLECTOR"),
  asyncHandler(async (req, res) => {
    if (!(await requireVerifiedCollector(req.user!.id))) {
      sendError(
        res,
        403,
        "COLLECTOR_NOT_VERIFIED",
        "Your collector account must be verified before you can plan a route.",
      );
      return;
    }

    const result = await getSuggestedRoute(req.user!.id);
    if (!result.ok) {
      sendError(
        res,
        409,
        "NO_ORIGIN",
        "Set your current location or service area before planning a route.",
      );
      return;
    }

    const pickupIds = result.stops.map((s) => s.pickupRequestId);
    const [stopPickups, nearbyPickups] = await Promise.all([
      prisma.pickupRequest.findMany({
        where: { id: { in: pickupIds } },
        include: { items: true, offers: { where: { status: OfferStatus.ACCEPTED } }, weightRecord: true, requester: { select: { fullName: true, phone: true, avatarUrl: true } } },
      }),
      prisma.pickupRequest.findMany({
        where: { id: { in: result.nearbyOpenPickupIds } },
        include: { items: true, offers: { where: { status: OfferStatus.ACCEPTED } }, weightRecord: true, requester: { select: { fullName: true, phone: true, avatarUrl: true } } },
      }),
    ]);
    const pickupById = new Map(stopPickups.map((p) => [p.id, p]));
    const nearbyById = new Map(nearbyPickups.map((p) => [p.id, p]));

    sendData(res, 200, {
      origin: result.origin,
      stops: result.stops
        .map((s) => {
          const pickup = pickupById.get(s.pickupRequestId);
          if (!pickup) return null;
          return {
            sequence: s.sequence,
            distanceFromPrevKm: s.distanceFromPrevKm,
            etaMinutes: s.etaMinutes,
            pickup: toPickupSummary(pickup),
          };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null),
      nearbyOpenPickups: result.nearbyOpenPickupIds
        .map((id) => nearbyById.get(id))
        .filter((p): p is NonNullable<typeof p> => p !== undefined)
        .map(toPickupSummary),
    });
  }),
);

routesRouter.get(
  "/active",
  requireAuth,
  requireRole("COLLECTOR"),
  asyncHandler(async (req, res) => {
    const routePlan = await getActiveRoute(req.user!.id);
    if (!routePlan) {
      sendData(res, 200, { routePlan: null });
      return;
    }

    const pickups = await prisma.pickupRequest.findMany({
      where: { id: { in: routePlan.stops.map((s) => s.pickupRequestId) } },
      include: { items: true, offers: { where: { status: OfferStatus.ACCEPTED } }, weightRecord: true, requester: { select: { fullName: true, phone: true, avatarUrl: true } } },
    });
    const pickupById = new Map(pickups.map((p) => [p.id, p]));

    sendData(res, 200, {
      routePlan: {
        id: routePlan.id,
        status: routePlan.status,
        startedAt: routePlan.startedAt,
        stops: routePlan.stops
          .map((stop) => {
            const pickup = pickupById.get(stop.pickupRequestId);
            if (!pickup) return null;
            return {
              sequence: stop.sequence,
              status: stop.status,
              pickup: toPickupSummary(pickup),
            };
          })
          .filter((s): s is NonNullable<typeof s> => s !== null),
      },
    });
  }),
);

routesRouter.post(
  "/start",
  requireAuth,
  requireRole("COLLECTOR"),
  requireCsrf,
  asyncHandler(async (req, res) => {
    if (!(await requireVerifiedCollector(req.user!.id))) {
      sendError(
        res,
        403,
        "COLLECTOR_NOT_VERIFIED",
        "Your collector account must be verified before you can start a route.",
      );
      return;
    }

    const parsed = startRouteSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    const result = await startRoute(req.user!.id, parsed.data.pickupRequestIds);
    if (!result.ok) {
      const errorsByReason = {
        no_origin: {
          status: 409,
          code: "NO_ORIGIN",
          message: "Set your current location or service area before starting a route.",
        },
        already_active: {
          status: 409,
          code: "ROUTE_ALREADY_ACTIVE",
          message: "You already have an active route. Finish or skip its remaining stops first.",
        },
        no_valid_stops: {
          status: 400,
          code: "NO_VALID_STOPS",
          message: "None of the selected pickups are currently assigned to you.",
        },
      } as const;
      const { status, code, message } = errorsByReason[result.reason];
      sendError(res, status, code, message);
      return;
    }

    sendData(res, 201, { routePlanId: result.routePlanId, firstPickupRequestId: result.firstPickupRequestId });
  }),
);

routesRouter.post(
  "/:routePlanId/stops/:pickupRequestId/skip",
  requireAuth,
  requireRole("COLLECTOR"),
  requireCsrf,
  asyncHandler(async (req, res) => {
    const { routePlanId, pickupRequestId } = req.params;

    const result = await skipStop(req.user!.id, routePlanId, pickupRequestId);
    if (!result.ok) {
      if (result.reason === "not_found") {
        sendError(res, 404, "NOT_FOUND", "Route stop not found.");
        return;
      }
      sendError(
        res,
        409,
        "STOP_NOT_SKIPPABLE",
        "This stop can't be skipped — it may already be in progress, visited, or skipped.",
      );
      return;
    }

    sendData(res, 200, { success: true });
  }),
);
