import { GreenPointsTransactionType, PickupStatus } from "@prisma/client";
import type { PickupRequest, PickupTrackingEvent } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { createNotification } from "../lib/notifications";
import { authorizePickupAccess } from "../lib/pickupAccess";
import { calculateGreenPointsForPickup, calculateMembershipLevel, getMembershipBadge } from "../lib/rewards";
import { getIO, pickupRoomName, type Server, type Socket } from "./socket";
import {
  joinPickupRoomSchema,
  locationUpdateSchema,
  statusUpdateSchema,
  submitWeightsSchema,
  acceptWeightsSchema,
  rejectWeightsSchema,
} from "../routes/pickups.schemas";

const PICKUP_JOIN_EVENT = "pickup:join";
const PICKUP_LOCATION_UPDATE_EVENT = "pickup:location-update";
const PICKUP_STATUS_UPDATE_EVENT = "pickup:status-update";
const PICKUP_SUBMIT_WEIGHTS_EVENT = "pickup:submit-weights";
const PICKUP_ACCEPT_WEIGHTS_EVENT = "pickup:accept-weights";
const PICKUP_REJECT_WEIGHTS_EVENT = "pickup:reject-weights";

const PICKUP_JOINED_EVENT = "pickup:joined";
const PICKUP_LOCATION_EVENT = "pickup:location";
export const PICKUP_STATUS_EVENT = "pickup:status";
const PICKUP_ERROR_EVENT = "pickup:error";

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

  // Enforce forward transitions only for standard status updates
  if (access.pickup.status === PickupStatus.VERIFYING_WEIGHTS) {
    emitPickupError(
      socket,
      PICKUP_STATUS_UPDATE_EVENT,
      pickupRequestId,
      "VALIDATION_ERROR",
      "Cannot update status directly while verifying weights.",
    );
    return;
  }
  if (
    access.pickup.status === PickupStatus.ARRIVED && 
    status !== PickupStatus.ARRIVED && 
    status !== PickupStatus.EN_ROUTE
  ) {
    emitPickupError(
      socket,
      PICKUP_STATUS_UPDATE_EVENT,
      pickupRequestId,
      "VALIDATION_ERROR",
      "Cannot change status from ARRIVED using this method.",
    );
    return;
  }

  const [updatedPickup, trackingEvent] = (await prisma.$transaction([
    prisma.pickupRequest.update({ where: { id: pickupRequestId }, data: { status } }),
    prisma.pickupTrackingEvent.create({ data: { pickupRequestId, status } }),
  ])) as [PickupRequest, PickupTrackingEvent];

  emitEvent(getIO().to(pickupRoomName(pickupRequestId)), PICKUP_STATUS_EVENT, {
    pickupRequestId,
    status: updatedPickup.status,
    createdAt: trackingEvent.createdAt,
  });
  
  void createNotification({
    userId: updatedPickup.requesterId,
    type: "PICKUP_STATUS_UPDATE",
    title: "Pickup Status Updated",
    message: `Your pickup is now ${status.replace("_", " ")}.`,
    relatedPickupRequestId: pickupRequestId,
  });
}


async function handleSubmitWeights(socket: Socket, payload: unknown): Promise<void> {
  const parsed = submitWeightsSchema.safeParse(payload);
  if (!parsed.success) {
    emitPickupError(socket, PICKUP_SUBMIT_WEIGHTS_EVENT, extractPickupRequestId(payload), "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
    return;
  }
  const { pickupRequestId, weights } = parsed.data;

  const access = await authorizePickupAccess(socket.data.user.id, pickupRequestId);
  if (!access.ok || access.role !== "collector") {
    emitPickupError(socket, PICKUP_SUBMIT_WEIGHTS_EVENT, pickupRequestId, "FORBIDDEN", "Only the assigned collector can submit weights.");
    return;
  }
  if (access.pickup.status !== PickupStatus.ARRIVED) {
    emitPickupError(socket, PICKUP_SUBMIT_WEIGHTS_EVENT, pickupRequestId, "VALIDATION_ERROR", "Pickup must be in ARRIVED status to submit weights.");
    return;
  }

  const [updatedPickup, trackingEvent] = await prisma.$transaction(async (tx) => {
    const pickup = await tx.pickupRequest.update({
      where: { id: pickupRequestId },
      data: { status: PickupStatus.VERIFYING_WEIGHTS },
    });
    for (const [category, exactWeightKg] of Object.entries(weights)) {
      await tx.pickupRequestItem.updateMany({
        where: { pickupRequestId, category: category as any },
        data: { exactWeightKg },
      });
    }
    const tracking = await tx.pickupTrackingEvent.create({ data: { pickupRequestId, status: PickupStatus.VERIFYING_WEIGHTS } });
    return [pickup, tracking];
  });

  emitEvent(getIO().to(pickupRoomName(pickupRequestId)), PICKUP_STATUS_EVENT, {
    pickupRequestId,
    status: updatedPickup.status,
    createdAt: trackingEvent.createdAt,
  });
  
  void createNotification({
    userId: updatedPickup.requesterId,
    type: "PICKUP_STATUS_UPDATE",
    title: "Weights Submitted",
    message: `The collector has submitted the exact weights for your pickup. Please verify them.`,
    relatedPickupRequestId: pickupRequestId,
  });
}

async function handleAcceptWeights(socket: Socket, payload: unknown): Promise<void> {
  const parsed = acceptWeightsSchema.safeParse(payload);
  if (!parsed.success) return;
  const { pickupRequestId } = parsed.data;

  const access = await authorizePickupAccess(socket.data.user.id, pickupRequestId);
  if (!access.ok || access.role !== "requester") {
    emitPickupError(socket, PICKUP_ACCEPT_WEIGHTS_EVENT, pickupRequestId, "FORBIDDEN", "Only the requester can accept weights.");
    return;
  }
  if (access.pickup.status !== PickupStatus.VERIFYING_WEIGHTS) {
    emitPickupError(socket, PICKUP_ACCEPT_WEIGHTS_EVENT, pickupRequestId, "VALIDATION_ERROR", "Pickup must be in VERIFYING_WEIGHTS status.");
    return;
  }

  const items = await prisma.pickupRequestItem.findMany({
    where: { pickupRequestId },
  });
  
  const validItems = items
    .filter(item => item.exactWeightKg !== null)
    .map(item => ({ category: item.category, exactWeightKg: item.exactWeightKg! }));

  const result = await prisma.$transaction(async (tx) => {
    const { totalPoints, basePoints, bonusPoints, rewardReason } = await calculateGreenPointsForPickup(
      access.pickup.requesterId,
      validItems,
      tx
    );

    const updated = await tx.pickupRequest.update({ where: { id: pickupRequestId }, data: { status: PickupStatus.COMPLETED } });
    const tracking = await tx.pickupTrackingEvent.create({ data: { pickupRequestId, status: PickupStatus.COMPLETED } });
    
    const userToUpdate = await tx.user.findUniqueOrThrow({ 
      where: { id: access.pickup.requesterId }, 
      select: { greenPointsBalance: true, referredById: true, referralRewardClaimed: true, totalGreenPoints: true } 
    });

    const lifetimePointsBefore = Math.max(userToUpdate.totalGreenPoints ?? 0, userToUpdate.greenPointsBalance ?? 0);
    const oldMembership = calculateMembershipLevel(lifetimePointsBefore);

    await tx.user.update({
      where: { id: access.pickup.requesterId },
      data: { 
        greenPointsBalance: { increment: totalPoints },
        totalGreenPoints: { increment: totalPoints },
      },
    });

    const lifetimePointsAfter = lifetimePointsBefore + totalPoints;
    const newMembership = calculateMembershipLevel(lifetimePointsAfter);

    if (newMembership !== oldMembership) {
      await tx.greenPointsTransaction.create({
        data: {
          userId: access.pickup.requesterId,
          pickupRequestId,
          points: 0,
          type: GreenPointsTransactionType.EARNED,
          category: "LOYALTY",
          description: `${newMembership.charAt(0).toUpperCase() + newMembership.slice(1).toLowerCase()} Membership Unlocked`,
        }
      });
    }
    
    await tx.greenPointsTransaction.create({
      data: {
        userId: access.pickup.requesterId,
        pickupRequestId,
        points: basePoints,
        basePoints,
        rewardReason: { materials: rewardReason.materials, bonuses: [] },
        type: GreenPointsTransactionType.EARNED,
        category: "PICKUP",
        description: "Pickup completed",
      },
    });

    for (const bonus of rewardReason.bonuses) {
      await tx.greenPointsTransaction.create({
        data: {
          userId: access.pickup.requesterId,
          pickupRequestId,
          points: bonus.points,
          bonusPoints: bonus.points,
          type: GreenPointsTransactionType.EARNED,
          category: "BONUS",
          description: bonus.name,
        }
      });
    }

    let referralRewardsProcessed = false;
    let referrerId: string | null = null;
    let newMilestones: number[] = [];

    const totalVerifiedWeight = validItems.reduce((sum, i) => sum + i.exactWeightKg, 0);
    if (userToUpdate.referredById && !userToUpdate.referralRewardClaimed && totalVerifiedWeight >= 5) {
      referralRewardsProcessed = true;
      referrerId = userToUpdate.referredById;
      
      await tx.user.update({
        where: { id: access.pickup.requesterId },
        data: {
          greenPointsBalance: { increment: 50 },
          totalGreenPoints: { increment: 50 },
          referralPointsEarned: { increment: 50 },
          referralRewardClaimed: true,
        },
      });

      await tx.greenPointsTransaction.create({
        data: {
          userId: access.pickup.requesterId,
          pickupRequestId,
          points: 50,
          type: GreenPointsTransactionType.EARNED,
          category: "REFERRAL",
          description: "Referral signup reward",
        },
      });

      const referrer = await tx.user.update({
        where: { id: userToUpdate.referredById },
        data: {
          greenPointsBalance: { increment: 100 },
          totalGreenPoints: { increment: 100 },
          referralPointsEarned: { increment: 100 },
          successfulReferrals: { increment: 1 },
        },
        select: { successfulReferrals: true, milestonesClaimed: true, id: true }
      });

      await tx.greenPointsTransaction.create({
        data: {
          userId: referrer.id,
          pickupRequestId,
          points: 100,
          type: GreenPointsTransactionType.EARNED,
          category: "REFERRAL",
          description: "Friend referral reward",
        },
      });

      const milestones = [
        { count: 10, points: 100 },
        { count: 20, points: 300 },
        { count: 30, physical: "Eco-friendly Tote Bag" },
        { count: 50, physical: "Tree Sapling + Community Recognition Badge" },
      ];

      for (const m of milestones) {
        if (referrer.successfulReferrals >= m.count && !referrer.milestonesClaimed.includes(m.count)) {
          newMilestones.push(m.count);
          await tx.user.update({
            where: { id: referrer.id },
            data: {
              milestonesClaimed: { push: m.count },
              ...(m.points ? {
                greenPointsBalance: { increment: m.points },
                totalGreenPoints: { increment: m.points },
              } : {})
            }
          });
          
          if (m.points) {
            await tx.greenPointsTransaction.create({
              data: {
                userId: referrer.id,
                points: m.points,
                type: GreenPointsTransactionType.EARNED,
                category: "REFERRAL",
                description: `Referral milestone reward (${m.count} friends)`,
              }
            });
          }
        }
      }
    }

    return { updated, tracking, referralRewardsProcessed, referrerId, newMilestones };
  });

  const updatedPickup = result.updated;
  const trackingEvent = result.tracking;

  emitEvent(getIO().to(pickupRoomName(pickupRequestId)), PICKUP_STATUS_EVENT, {
    pickupRequestId,
    status: updatedPickup.status,
    createdAt: trackingEvent.createdAt,
  });
  
  if (updatedPickup.assignedCollectorId) {
    void createNotification({
      userId: updatedPickup.assignedCollectorId,
      type: "PICKUP_STATUS_UPDATE",
      title: "Pickup Completed",
      message: `The household has verified the weights and the pickup is now completed!`,
      relatedPickupRequestId: pickupRequestId,
    });
  }

  if (result.referralRewardsProcessed) {
    void createNotification({
      userId: access.pickup.requesterId,
      type: "GENERIC",
      title: "Referral Reward",
      message: `🎉 Welcome! You earned 50 Green Points for joining through a referral and completing your first verified pickup.`,
    });

    if (result.referrerId) {
      void createNotification({
        userId: result.referrerId,
        type: "GENERIC",
        title: "Referral Reward",
        message: `🎉 Congratulations! Your referred friend completed their first verified pickup. You earned 100 Green Points.`,
      });
      
      for (const m of result.newMilestones) {
        void createNotification({
          userId: result.referrerId,
          type: "GENERIC",
          title: "Referral Milestone Reached",
          message: `🎉 You reached a new referral milestone (${m} friends)!`,
        });
      }
    }
  }
}

async function handleRejectWeights(socket: Socket, payload: unknown): Promise<void> {
  const parsed = rejectWeightsSchema.safeParse(payload);
  if (!parsed.success) return;
  const { pickupRequestId } = parsed.data;

  const access = await authorizePickupAccess(socket.data.user.id, pickupRequestId);
  if (!access.ok || access.role !== "requester") {
    emitPickupError(socket, PICKUP_REJECT_WEIGHTS_EVENT, pickupRequestId, "FORBIDDEN", "Only the requester can reject weights.");
    return;
  }
  if (access.pickup.status !== PickupStatus.VERIFYING_WEIGHTS) {
    emitPickupError(socket, PICKUP_REJECT_WEIGHTS_EVENT, pickupRequestId, "VALIDATION_ERROR", "Pickup must be in VERIFYING_WEIGHTS status.");
    return;
  }

  const [updatedPickup, trackingEvent] = await prisma.$transaction([
    prisma.pickupRequest.update({ where: { id: pickupRequestId }, data: { status: PickupStatus.ARRIVED } }),
    prisma.pickupTrackingEvent.create({ data: { pickupRequestId, status: PickupStatus.ARRIVED } }),
  ]) as [PickupRequest, PickupTrackingEvent];

  emitEvent(getIO().to(pickupRoomName(pickupRequestId)), PICKUP_STATUS_EVENT, {
    pickupRequestId,
    status: updatedPickup.status,
    createdAt: trackingEvent.createdAt,
  });
  
  if (updatedPickup.assignedCollectorId) {
    void createNotification({
      userId: updatedPickup.assignedCollectorId,
      type: "PICKUP_STATUS_UPDATE",
      title: "Weights Rejected",
      message: `The household has rejected the submitted weights. Please re-verify and submit again.`,
      relatedPickupRequestId: pickupRequestId,
    });
  }
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
    socket.on(PICKUP_SUBMIT_WEIGHTS_EVENT, safeHandler(socket, PICKUP_SUBMIT_WEIGHTS_EVENT, handleSubmitWeights));
    socket.on(PICKUP_ACCEPT_WEIGHTS_EVENT, safeHandler(socket, PICKUP_ACCEPT_WEIGHTS_EVENT, handleAcceptWeights));
    socket.on(PICKUP_REJECT_WEIGHTS_EVENT, safeHandler(socket, PICKUP_REJECT_WEIGHTS_EVENT, handleRejectWeights));
  });
}
