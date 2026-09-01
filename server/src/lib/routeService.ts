import { PickupStatus, RoutePlanStatus, RouteStopStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { logger } from "./logger";
import { createNotification } from "./notifications";
import { emitToRoom } from "../realtime/emitToRoom";
import { PICKUP_STATUS_EVENT } from "../realtime/events";
import { optimizeRoute, type RouteStopCandidate } from "./routeOptimization";
import { getRoutingMatrix } from "./osrmClient";
import { distanceKm, MAX_COLLECTOR_MATCH_DISTANCE_KM, type LatLng } from "./geoDistance";

const ROUTE_CANDIDATE_LIMIT = 30;
const NEARBY_OPEN_PICKUP_LIMIT = 5;

async function resolveCollectorOrigin(collectorId: string): Promise<LatLng | null> {
  const profile = await prisma.collectorProfile.findUnique({ where: { userId: collectorId } });
  if (!profile) return null;
  if (profile.lastKnownLatitude !== null && profile.lastKnownLongitude !== null) {
    return { lat: profile.lastKnownLatitude, lng: profile.lastKnownLongitude };
  }
  if (profile.serviceAreaLatitude !== null && profile.serviceAreaLongitude !== null) {
    return { lat: profile.serviceAreaLatitude, lng: profile.serviceAreaLongitude };
  }
  return null;
}

async function getNearbyOpenPickupIds(
  collectorId: string,
  origin: LatLng,
  excludePickupIds: string[],
): Promise<string[]> {
  const collectorProfile = await prisma.collectorProfile.findUnique({ where: { userId: collectorId } });
  if (!collectorProfile || collectorProfile.verificationStatus !== "APPROVED") return [];

  const openPickups = await prisma.pickupRequest.findMany({
    where: {
      status: PickupStatus.PENDING,
      id: { notIn: excludePickupIds },
      latitude: { not: null },
      longitude: { not: null },
      OR: [{ isExclusiveToPreferred: { not: true } }, { preferredCollectorId: collectorId }],
    },
    select: { id: true, latitude: true, longitude: true, requester: { select: { collectorFindRadiusKm: true } } },
    take: 100,
  });

  const collectorMaxRadius =
    collectorProfile.serviceAreaRadiusKm !== null
      ? collectorProfile.serviceAreaRadiusKm
      : Infinity;

  return openPickups
    .map((p) => {
      const userMaxRadius = p.requester?.collectorFindRadiusKm ?? MAX_COLLECTOR_MATCH_DISTANCE_KM;
      const maxAllowed = Math.min(collectorMaxRadius, userMaxRadius);
      return { id: p.id, distance: distanceKm(origin, { lat: p.latitude as number, lng: p.longitude as number }), maxAllowed };
    })
    .filter((p) => p.distance <= p.maxAllowed)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, NEARBY_OPEN_PICKUP_LIMIT)
    .map((p) => p.id);
}

async function broadcastQueuePositions(routePlanId: string): Promise<void> {
  const queuedStops = await prisma.routeStop.findMany({
    where: { routePlanId, status: RouteStopStatus.QUEUED },
    orderBy: { sequence: "asc" },
    include: { pickupRequest: { select: { status: true, updatedAt: true } } },
  });

  const stopsRemaining = queuedStops.length;
  queuedStops.forEach((stop, index) => {
    try {
      emitToRoom(stop.pickupRequestId, PICKUP_STATUS_EVENT, {
        pickupRequestId: stop.pickupRequestId,
        status: stop.pickupRequest.status,
        createdAt: stop.pickupRequest.updatedAt,
        routePlanId,
        queuePosition: index + 1,
        stopsRemaining,
      });
    } catch (err) {
      logger.debug({ err, pickupRequestId: stop.pickupRequestId }, "Skipped real-time broadcast for route queue update");
    }
  });
}

export interface SuggestedStop {
  pickupRequestId: string;
  sequence: number;
  distanceFromPrevKm: number;
  etaMinutes: number;
}

export type SuggestedRouteResult =
  | { ok: true; origin: LatLng; stops: SuggestedStop[]; nearbyOpenPickupIds: string[] }
  | { ok: false; reason: "no_origin" };

export async function getSuggestedRoute(collectorId: string): Promise<SuggestedRouteResult> {
  const origin = await resolveCollectorOrigin(collectorId);
  if (!origin) return { ok: false, reason: "no_origin" };

  const alreadyRouted = await prisma.routeStop.findMany({
    where: { routePlan: { collectorId, status: RoutePlanStatus.ACTIVE } },
    select: { pickupRequestId: true },
  });
  const excludeIds = alreadyRouted.map((s) => s.pickupRequestId);

  const assignedPickups = await prisma.pickupRequest.findMany({
    where: {
      assignedCollectorId: collectorId,
      status: PickupStatus.ASSIGNED,
      id: { notIn: excludeIds },
      latitude: { not: null },
      longitude: { not: null },
    },
    take: ROUTE_CANDIDATE_LIMIT,
  });

  const candidates: RouteStopCandidate[] = assignedPickups.map((p) => ({
    pickupRequestId: p.id,
    lat: p.latitude as number,
    lng: p.longitude as number,
    pickupDate: p.pickupDate,
  }));

  const matrix = await getRoutingMatrix(origin, candidates.map(c => ({ lat: c.lat, lng: c.lng })));
  const stops: SuggestedStop[] = optimizeRoute(candidates, matrix);

  const nearbyOpenPickupIds = await getNearbyOpenPickupIds(
    collectorId,
    origin,
    [...excludeIds, ...stops.map((s) => s.pickupRequestId)],
  );

  return { ok: true, origin, stops, nearbyOpenPickupIds };
}

export type StartRouteResult =
  | { ok: true; routePlanId: string; firstPickupRequestId: string | null }
  | { ok: false; reason: "no_origin" | "already_active" | "no_valid_stops" };

export async function startRoute(collectorId: string, pickupRequestIds: string[]): Promise<StartRouteResult> {
  const origin = await resolveCollectorOrigin(collectorId);
  if (!origin) return { ok: false, reason: "no_origin" };

  const existingActive = await prisma.routePlan.findFirst({
    where: { collectorId, status: RoutePlanStatus.ACTIVE },
    select: { id: true },
  });
  if (existingActive) return { ok: false, reason: "already_active" };

  const pickups = await prisma.pickupRequest.findMany({
    where: {
      id: { in: pickupRequestIds },
      assignedCollectorId: collectorId,
      status: PickupStatus.ASSIGNED,
      latitude: { not: null },
      longitude: { not: null },
    },
  });
  if (pickups.length === 0) return { ok: false, reason: "no_valid_stops" };

  const validPickups = new Set(pickups.map((p) => p.id));
  const ordered = pickupRequestIds
    .filter((id) => validPickups.has(id))
    .map((id, index) => ({ pickupRequestId: id, sequence: index + 1 }));
  const requesterById = new Map(pickups.map((p) => [p.id, p.requesterId]));

  const { routePlanId, firstPickupRequestId } = await prisma.$transaction(async (tx) => {
    const routePlan = await tx.routePlan.create({
      data: {
        collectorId,
        status: RoutePlanStatus.ACTIVE,
        originLatitude: origin.lat,
        originLongitude: origin.lng,
        stops: { create: ordered.map((s) => ({ pickupRequestId: s.pickupRequestId, sequence: s.sequence })) },
      },
    });

    const first = ordered[0];
    let firstPickupRequestId: string | null = null;
    if (first) {
      const claimed = await tx.pickupRequest.updateMany({
        where: { id: first.pickupRequestId, status: PickupStatus.ASSIGNED },
        data: { status: PickupStatus.EN_ROUTE },
      });
      if (claimed.count > 0) {
        await tx.pickupTrackingEvent.create({
          data: { pickupRequestId: first.pickupRequestId, status: PickupStatus.EN_ROUTE },
        });
        firstPickupRequestId = first.pickupRequestId;
      }
    }

    return { routePlanId: routePlan.id, firstPickupRequestId };
  });

  const stopsRemaining = ordered.length;
  ordered.forEach((stop, index) => {
    const requesterId = requesterById.get(stop.pickupRequestId);
    if (!requesterId) return;
    if (stop.pickupRequestId === firstPickupRequestId) {
      void createNotification({
        userId: requesterId,
        type: "PICKUP_STATUS_UPDATE",
        title: "Collector On The Way",
        message: "Your collector has started their route and is on the way to you.",
        relatedPickupRequestId: stop.pickupRequestId,
        emailPreference: "emailNotificationsEnabled",
      });
    } else {
      void createNotification({
        userId: requesterId,
        type: "ROUTE_UPDATE",
        title: "You're On Your Collector's Route",
        message: `Your collector started their route today. You're stop ${index + 1} of ${stopsRemaining}.`,
        relatedPickupRequestId: stop.pickupRequestId,
        emailPreference: "emailNotificationsEnabled",
      });
    }
  });

  await broadcastQueuePositions(routePlanId);

  return { ok: true, routePlanId, firstPickupRequestId };
}

export async function advanceRouteIfNeeded(pickupRequestId: string): Promise<void> {
  const stop = await prisma.routeStop.findFirst({
    where: {
      pickupRequestId,
      status: RouteStopStatus.QUEUED,
      routePlan: { status: RoutePlanStatus.ACTIVE },
    },
  });
  if (!stop) return;

  await prisma.routeStop.update({
    where: { id: stop.id },
    data: { status: RouteStopStatus.VISITED, visitedAt: new Date() },
  });

  const nextStop = await prisma.routeStop.findFirst({
    where: { routePlanId: stop.routePlanId, status: RouteStopStatus.QUEUED },
    orderBy: { sequence: "asc" },
  });

  if (!nextStop) {
    await prisma.routePlan.update({
      where: { id: stop.routePlanId },
      data: { status: RoutePlanStatus.COMPLETED, completedAt: new Date() },
    });
    return;
  }

  const claimed = await prisma.pickupRequest.updateMany({
    where: { id: nextStop.pickupRequestId, status: PickupStatus.ASSIGNED },
    data: { status: PickupStatus.EN_ROUTE },
  });

  if (claimed.count > 0) {
    const updatedPickup = await prisma.pickupRequest.findUniqueOrThrow({
      where: { id: nextStop.pickupRequestId },
    });
    await prisma.pickupTrackingEvent.create({
      data: { pickupRequestId: nextStop.pickupRequestId, status: PickupStatus.EN_ROUTE },
    });

    try {
      emitToRoom(nextStop.pickupRequestId, PICKUP_STATUS_EVENT, {
        pickupRequestId: nextStop.pickupRequestId,
        status: PickupStatus.EN_ROUTE,
        createdAt: updatedPickup.updatedAt,
        routePlanId: stop.routePlanId,
      });
    } catch (err) {
      logger.debug({ err, pickupRequestId: nextStop.pickupRequestId }, "Skipped real-time broadcast for route advance");
    }

    void createNotification({
      userId: updatedPickup.requesterId,
      type: "PICKUP_STATUS_UPDATE",
      title: "Collector On The Way",
      message: "Your collector has started their route and is on the way to you.",
      relatedPickupRequestId: nextStop.pickupRequestId,
      emailPreference: "emailNotificationsEnabled",
    });
  }

  await broadcastQueuePositions(stop.routePlanId);
}

export async function attachPickupToActiveRouteIfAny(collectorId: string, pickupRequestId: string): Promise<void> {
  const routePlan = await prisma.routePlan.findFirst({
    where: { collectorId, status: RoutePlanStatus.ACTIVE },
  });
  if (!routePlan) return;

  const pickup = await prisma.pickupRequest.findUnique({ where: { id: pickupRequestId } });
  if (!pickup || pickup.latitude === null || pickup.longitude === null) return;

  const queuedStops = await prisma.routeStop.findMany({
    where: { routePlanId: routePlan.id, status: RouteStopStatus.QUEUED },
    include: { pickupRequest: true },
    orderBy: { sequence: "asc" },
  });

  const currentStop = queuedStops.find((s) => s.pickupRequest.status === PickupStatus.EN_ROUTE);
  const origin: LatLng =
    currentStop && currentStop.pickupRequest.latitude !== null && currentStop.pickupRequest.longitude !== null
      ? { lat: currentStop.pickupRequest.latitude, lng: currentStop.pickupRequest.longitude }
      : { lat: routePlan.originLatitude, lng: routePlan.originLongitude };

  const remainingToReorder = queuedStops.filter((s) => s.id !== currentStop?.id);
  const candidates: RouteStopCandidate[] = [
    ...remainingToReorder.map((s) => ({
      pickupRequestId: s.pickupRequestId,
      lat: s.pickupRequest.latitude as number,
      lng: s.pickupRequest.longitude as number,
      pickupDate: s.pickupRequest.pickupDate,
    })),
    {
      pickupRequestId: pickup.id,
      lat: pickup.latitude,
      lng: pickup.longitude,
      pickupDate: pickup.pickupDate,
    },
  ];

  const matrix = await getRoutingMatrix(origin, candidates.map(c => ({ lat: c.lat, lng: c.lng })));
  const reordered = optimizeRoute(candidates, matrix);
  const sequenceOffset = currentStop ? currentStop.sequence : 0;

  await prisma.$transaction(
    reordered.map((s, index) =>
      prisma.routeStop.upsert({
        where: { routePlanId_pickupRequestId: { routePlanId: routePlan.id, pickupRequestId: s.pickupRequestId } },
        update: { sequence: sequenceOffset + index + 1 },
        create: { routePlanId: routePlan.id, pickupRequestId: s.pickupRequestId, sequence: sequenceOffset + index + 1 },
      }),
    ),
  );

  void createNotification({
    userId: pickup.requesterId,
    type: "ROUTE_UPDATE",
    title: "Added To Collector's Route",
    message: "You've been added to your collector's route today.",
    relatedPickupRequestId: pickup.id,
    emailPreference: "emailNotificationsEnabled",
  });

  await broadcastQueuePositions(routePlan.id);
}

export type SkipStopResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "not_skippable" };

export async function skipStop(
  collectorId: string,
  routePlanId: string,
  pickupRequestId: string,
): Promise<SkipStopResult> {
  const routePlan = await prisma.routePlan.findUnique({ where: { id: routePlanId } });
  if (!routePlan || routePlan.collectorId !== collectorId || routePlan.status !== RoutePlanStatus.ACTIVE) {
    return { ok: false, reason: "not_found" };
  }

  const stop = await prisma.routeStop.findUnique({
    where: { routePlanId_pickupRequestId: { routePlanId, pickupRequestId } },
    include: { pickupRequest: { select: { status: true } } },
  });
  if (!stop) return { ok: false, reason: "not_found" };
  if (stop.status !== RouteStopStatus.QUEUED || stop.pickupRequest.status === PickupStatus.EN_ROUTE) {
    return { ok: false, reason: "not_skippable" };
  }

  await prisma.routeStop.update({
    where: { id: stop.id },
    data: { status: RouteStopStatus.SKIPPED, skippedAt: new Date() },
  });

  const remainingQueued = await prisma.routeStop.count({
    where: { routePlanId, status: RouteStopStatus.QUEUED },
  });
  if (remainingQueued === 0) {
    await prisma.routePlan.update({
      where: { id: routePlanId },
      data: { status: RoutePlanStatus.COMPLETED, completedAt: new Date() },
    });
  }

  await broadcastQueuePositions(routePlanId);
  return { ok: true };
}

export async function getActiveRoute(collectorId: string) {
  return prisma.routePlan.findFirst({
    where: { collectorId, status: RoutePlanStatus.ACTIVE },
    include: { stops: { orderBy: { sequence: "asc" } } },
  });
}
