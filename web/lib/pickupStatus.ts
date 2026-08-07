import type { PickupStatus } from "@/lib/api/pickups";

export type PickupStatusTone = "warning" | "info" | "success" | "error";

export const PICKUP_STATUS_TONE: Record<PickupStatus, PickupStatusTone> = {
  PENDING: "warning",
  ASSIGNED: "info",
  EN_ROUTE: "info",
  ARRIVED: "info",
  COMPLETED: "success",
  CANCELLED: "error",
};

export const PICKUP_STATUS_LABEL: Record<PickupStatus, string> = {
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  EN_ROUTE: "En route",
  ARRIVED: "Arrived",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};
