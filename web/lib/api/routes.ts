import { authFetch, readCsrfToken } from "./auth";
import type { PickupRequestSummary } from "./pickups";

export type RoutePlanStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";
export type RouteStopStatus = "QUEUED" | "VISITED" | "SKIPPED";

export interface SuggestedRouteStop {
  sequence: number;
  distanceFromPrevKm: number;
  etaMinutes: number;
  pickup: PickupRequestSummary;
}

export interface SuggestedRoute {
  origin: { lat: number; lng: number };
  stops: SuggestedRouteStop[];
  nearbyOpenPickups: PickupRequestSummary[];
}

export function getSuggestedRoute(): Promise<SuggestedRoute> {
  return authFetch<SuggestedRoute>("/routes/suggested", { method: "GET" });
}

export interface ActiveRouteStop {
  sequence: number;
  status: RouteStopStatus;
  pickup: PickupRequestSummary;
}

export interface ActiveRoutePlan {
  id: string;
  status: RoutePlanStatus;
  startedAt: string;
  stops: ActiveRouteStop[];
}

export function getActiveRoute(): Promise<{ routePlan: ActiveRoutePlan | null }> {
  return authFetch<{ routePlan: ActiveRoutePlan | null }>("/routes/active", { method: "GET" });
}

export function startRoute(pickupRequestIds: string[]): Promise<{ routePlanId: string; firstPickupRequestId: string | null }> {
  return authFetch<{ routePlanId: string; firstPickupRequestId: string | null }>("/routes/start", {
    method: "POST",
    body: JSON.stringify({ pickupRequestIds }),
    headers: { "x-csrf-token": readCsrfToken() },
  });
}

export function skipRouteStop(routePlanId: string, pickupRequestId: string): Promise<{ success: boolean }> {
  return authFetch<{ success: boolean }>(
    `/routes/${encodeURIComponent(routePlanId)}/stops/${encodeURIComponent(pickupRequestId)}/skip`,
    { method: "POST", headers: { "x-csrf-token": readCsrfToken() } },
  );
}
