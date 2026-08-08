import { prisma } from "./prisma";
import type { PickupRequest } from "@prisma/client";

type PickupAccessRole = "requester" | "collector";

export type PickupAccessResult =
  | { ok: true; pickup: PickupRequest; role: PickupAccessRole }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "forbidden" };

export async function authorizePickupAccess(
  userId: string,
  pickupRequestId: string,
): Promise<PickupAccessResult> {
  const pickup = await prisma.pickupRequest.findUnique({ where: { id: pickupRequestId } });
  if (!pickup) {
    return { ok: false, reason: "not_found" };
  }
  if (pickup.requesterId === userId) {
    return { ok: true, pickup, role: "requester" };
  }
  if (pickup.assignedCollectorId === userId) {
    return { ok: true, pickup, role: "collector" };
  }
  return { ok: false, reason: "forbidden" };
}
