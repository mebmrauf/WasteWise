import { GreenPointsTransactionType, PickupStatus } from "@prisma/client";
import type { PickupRequest, PickupTrackingEvent } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { authorizePickupAccess } from "../lib/pickupAccess";
import { POINTS_PER_PICKUP } from "../lib/rewards";
import { getIO, pickupRoomName, type Server, type Socket } from "./socket";
import {
  joinPickupRoomSchema,
  locationUpdateSchema,
  statusUpdateSchema,
} from "../routes/pickups.schemas";

export const PICKUP_JOIN_EVENT = "pickup:join";
export const PICKUP_LOCATION_UPDATE_EVENT = "pickup:location-update";
export const PICKUP_STATUS_UPDATE_EVENT = "pickup:status-update";

export const PICKUP_JOINED_EVENT = "pickup:joined";
export const PICKUP_LOCATION_EVENT = "pickup:location";
export const PICKUP_STATUS_EVENT = "pickup:status";
export const PICKUP_ERROR_EVENT = "pickup:error";

const TERMINAL_STATUSES: readonly PickupStatus[] = [PickupStatus.COMPLETED, PickupStatus.CANCELLED];

function emitEvent(emitter: unknown, event: string, payload: unknown): void {
  (emitter as { emit: (event: string, payload: unknown) => void }).emit(event, payload);
}

function extractPickupRequestId(payload: unknown): string | undefined {
  if (payload && typeof payload === "object" && "pickupRequestId" in payload) {
    const value = (payload as { pickupRequestId?: unknown }).pickupRequestId;
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

function emitPickupError(
  socket: Socket,
  sourceEvent: string,
  pickupRequestId: string | undefined,
  code: string,
  message: string,
): void {
  emitEvent(socket, PICKUP_ERROR_EVENT, {
    event: sourceEvent,
    pickupRequestId,
    error: { code, message },
  });
}

function safeHandler(
  socket: Socket,
  eventName: string,
  handler: (socket: Socket, payload: unknown) => Promise<void>,
): (payload: unknown) => void {
  return (payload: unknown) => {
    handler(socket, payload).catch((err: unknown) => {
      logger.error(
        { err, event: eventName, userId: socket.data.user.id },
        "Unhandled error in pickup tracking socket handler",
      );
      emitPickupError(
        socket,
        eventName,
        extractPickupRequestId(payload),
        "INTERNAL_ERROR",
        "Something went wrong. Please try again.",
      );
    });
  };
}

async function handleJoin(socket: Socket, payload: unknown): Promise<void> {
  const parsed = joinPickupRoomSchema.safeParse(payload);
  if (!parsed.success) {
    emitPickupError(
      socket,
      PICKUP_JOIN_EVENT,
      extractPickupRequestId(payload),
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
    return;
  }
  const { pickupRequestId } = parsed.data;

  const access = await authorizePickupAccess(socket.data.user.id, pickupRequestId);
  if (!access.ok) {
    emitPickupError(
      socket,
      PICKUP_JOIN_EVENT,
      pickupRequestId,
      access.reason === "not_found" ? "NOT_FOUND" : "FORBIDDEN",
      access.reason === "not_found"
        ? "Pickup not found."
        : "You are not authorized to track this pickup.",
    );
    return;
  }

  await socket.join(pickupRoomName(pickupRequestId));
  emitEvent(socket, PICKUP_JOINED_EVENT, { pickupRequestId, status: access.pickup.status });
}

async function handleLocationUpdate(socket: Socket, payload: unknown): Promise<void> {
  const parsed = locationUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    emitPickupError(
      socket,
      PICKUP_LOCATION_UPDATE_EVENT,
      extractPickupRequestId(payload),
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
    return;
  }
  const { pickupRequestId, lat, lng } = parsed.data;

  const access = await authorizePickupAccess(socket.data.user.id, pickupRequestId);
  if (!access.ok) {
    emitPickupError(
      socket,
      PICKUP_LOCATION_UPDATE_EVENT,
      pickupRequestId,
      access.reason === "not_found" ? "NOT_FOUND" : "FORBIDDEN",
      access.reason === "not_found"
        ? "Pickup not found."
        : "You are not authorized to update location for this pickup.",
    );
    return;
  }
  if (access.role !== "collector") {
    emitPickupError(
      socket,
      PICKUP_LOCATION_UPDATE_EVENT,
      pickupRequestId,
      "FORBIDDEN",
      "Only the assigned collector can push location updates.",
    );
    return;
  }

  const updatedAt = new Date();
  const result = await prisma.collectorProfile.updateMany({
    where: { userId: socket.data.user.id },
    data: {
      lastKnownLatitude: lat,
      lastKnownLongitude: lng,
      lastLocationUpdatedAt: updatedAt,
    },
  });
  if (result.count === 0) {
    logger.warn(
      { userId: socket.data.user.id, pickupRequestId },
      "Location update from a collector with no CollectorProfile row",
    );
    emitPickupError(
      socket,
      PICKUP_LOCATION_UPDATE_EVENT,
      pickupRequestId,
      "COLLECTOR_PROFILE_NOT_FOUND",
      "Your collector profile could not be found.",
    );
    return;
  }

  emitEvent(getIO().to(pickupRoomName(pickupRequestId)), PICKUP_LOCATION_EVENT, {
    pickupRequestId,
    lat,
    lng,
    updatedAt,
  });
}

async function handleStatusUpdate(socket: Socket, payload: unknown): Promise<void> {
  const parsed = statusUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    emitPickupError(
      socket,
      PICKUP_STATUS_UPDATE_EVENT,
      extractPickupRequestId(payload),
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
    return;
  }
  const { pickupRequestId, status } = parsed.data;

  const access = await authorizePickupAccess(socket.data.user.id, pickupRequestId);
  if (!access.ok) {
    emitPickupError(
      socket,
      PICKUP_STATUS_UPDATE_EVENT,
      pickupRequestId,
      access.reason === "not_found" ? "NOT_FOUND" : "FORBIDDEN",
      access.reason === "not_found"
        ? "Pickup not found."
        : "You are not authorized to update status for this pickup.",
    );
    return;
  }
  if (access.role !== "collector") {
    emitPickupError(
      socket,
      PICKUP_STATUS_UPDATE_EVENT,
      pickupRequestId,
      "FORBIDDEN",
      "Only the assigned collector can update pickup status.",
    );
    return;
  }
  if (TERMINAL_STATUSES.includes(access.pickup.status)) {
    emitPickupError(
      socket,
      PICKUP_STATUS_UPDATE_EVENT,
      pickupRequestId,
      "VALIDATION_ERROR",
      `This pickup is already ${access.pickup.status.toLowerCase()} and its status cannot be changed further.`,
    );
    return;
  }

  const isCompleting = status === PickupStatus.COMPLETED;
  const [updatedPickup, trackingEvent] = (await prisma.$transaction([
    prisma.pickupRequest.update({ where: { id: pickupRequestId }, data: { status } }),
    prisma.pickupTrackingEvent.create({ data: { pickupRequestId, status } }),
    ...(isCompleting
      ? [
          prisma.user.update({
            where: { id: access.pickup.requesterId },
            data: { greenPointsBalance: { increment: POINTS_PER_PICKUP } },
          }),
          prisma.greenPointsTransaction.create({
            data: {
              userId: access.pickup.requesterId,
              pickupRequestId,
              points: POINTS_PER_PICKUP,
              type: GreenPointsTransactionType.EARNED,
              description: "Pickup completed",
            },
          }),
        ]
      : []),
  ])) as [PickupRequest, PickupTrackingEvent, ...unknown[]];

  emitEvent(getIO().to(pickupRoomName(pickupRequestId)), PICKUP_STATUS_EVENT, {
    pickupRequestId,
    status: updatedPickup.status,
    createdAt: trackingEvent.createdAt,
  });
}

export function registerPickupTrackingHandlers(io: Server): void {
  io.on("connection", (socket) => {
    socket.on(PICKUP_JOIN_EVENT, safeHandler(socket, PICKUP_JOIN_EVENT, handleJoin));
    socket.on(
      PICKUP_LOCATION_UPDATE_EVENT,
      safeHandler(socket, PICKUP_LOCATION_UPDATE_EVENT, handleLocationUpdate),
    );
    socket.on(
      PICKUP_STATUS_UPDATE_EVENT,
      safeHandler(socket, PICKUP_STATUS_UPDATE_EVENT, handleStatusUpdate),
    );
  });
}
