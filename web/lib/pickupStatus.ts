import type { PickupStatus } from "@/lib/api/pickups";

export type PickupStatusTone = "warning" | "info" | "success" | "error";

export const PICKUP_STATUS_TONE: Record<PickupStatus, PickupStatusTone> = {
  PENDING: "warning",
  ASSIGNED: "info",
  EN_ROUTE: "info",
  ARRIVED: "info",
  VERIFYING_WEIGHTS: "info",
  COMPLETED: "success",
  CANCELLED: "error",
};

export const PICKUP_STATUS_LABEL: Record<PickupStatus, string> = {
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  EN_ROUTE: "En route",
  ARRIVED: "Arrived",
  VERIFYING_WEIGHTS: "Verifying weights",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};
