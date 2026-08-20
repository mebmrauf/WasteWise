import { prisma } from "./prisma";
import type { PickupRequest } from "@prisma/client";

type PickupAccessRole = "requester" | "collector" | "both";

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

  const isRequester = pickup.requesterId === userId;
  const isCollector = pickup.assignedCollectorId === userId;

  if (isRequester && isCollector) {
    return { ok: true, pickup, role: "both" };
  }
  if (isRequester) {
    return { ok: true, pickup, role: "requester" };
  }
  if (isCollector) {
    return { ok: true, pickup, role: "collector" };
  }

  return { ok: false, reason: "forbidden" };
}
