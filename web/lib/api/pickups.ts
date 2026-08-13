import { authFetch, readCsrfToken } from "./auth";
import type { OfferStatus } from "@/lib/offerStatus";
import type { VehicleType } from "@/lib/vehicleType";
import type { WasteCategory } from "@/components/WasteCategorySelector";

export type PickupStatus = "PENDING"  | "ASSIGNED"
  | "EN_ROUTE"
  | "ARRIVED"
  | "VERIFYING_WEIGHTS"
  | "COMPLETED"
  | "CANCELLED";

export type LoadSize = "SMALL" | "MEDIUM" | "LARGE" | "EXTRA_LARGE";

export interface KgRange {
  minKg: number;
  maxKg: number;
}

export const LOAD_SIZE_KG_RANGES: Record<LoadSize, KgRange> = {
  SMALL: { minKg: 1, maxKg: 3 },
  MEDIUM: { minKg: 3, maxKg: 8 },
  LARGE: { minKg: 8, maxKg: 15 },
  EXTRA_LARGE: { minKg: 15, maxKg: 25 },
};

export const LOAD_SIZE_LABELS: Record<LoadSize, string> = {
  SMALL: "Small load",
  MEDIUM: "Medium load",
  LARGE: "Large load",
  EXTRA_LARGE: "Extra large load",
};

export function formatKgRange(size: LoadSize): string {
  const { minKg, maxKg } = LOAD_SIZE_KG_RANGES[size];
  return `${minKg}-${maxKg} Kg`;
}

export interface CollectorLocation {
  lat: number;
  lng: number;
  updatedAt: string;
}

export interface TrackedCollector {
  fullName: string;
  phone: string | null;
  vehicleType: VehicleType | null;
  /** A Cloudinary public_id, not a full URL — resolve via `resolveAvatarUrl` before rendering. */
  avatarUrl: string | null;
}

export interface PickupTracking {
  pickupRequestId: string;
  status: PickupStatus;
  pickupLocation: { lat: number; lng: number };
  collectorLocation: CollectorLocation | null;
  collector: TrackedCollector | null;
}

export function getPickupTracking(pickupRequestId: string): Promise<PickupTracking> {
  return authFetch<PickupTracking>(`/pickups/${encodeURIComponent(pickupRequestId)}/tracking`, {
    method: "GET",
  });
}

interface PickupRequestItem {
  id: string;
  category: WasteCategory;
  loadSize: LoadSize;
  exactWeightKg: number | null;
}

export interface PickupRequestSummary {
  id: string;
  requesterId: string;
  assignedCollectorId: string | null;
  items: PickupRequestItem[];
  timeSlotStart: string;
  timeSlotEnd: string;
  status: PickupStatus;
  placeId: string;
  pickupFormattedAddress: string;
  latitude: number;
  longitude: number;
  bidAmountsPerKg?: Record<string, number> | null;
  createdAt: string;
  updatedAt: string;
}

export function listPickups(): Promise<{ pickups: PickupRequestSummary[] }> {
  return authFetch<{ pickups: PickupRequestSummary[] }>("/pickups", { method: "GET" });
}

interface WeightRecordSnapshot {
  estimatedMinKg: number;
  estimatedMaxKg: number;
  exactWeightKg: number | null;
  loggedAt: string | null;
}

export interface PickupRequestDetail extends PickupRequestSummary {
  weightRecord: WeightRecordSnapshot | null;
}

export function getPickupDetail(pickupRequestId: string): Promise<{ pickup: PickupRequestDetail }> {
  return authFetch<{ pickup: PickupRequestDetail }>(`/pickups/${encodeURIComponent(pickupRequestId)}`, {
    method: "GET",
  });
}

export interface CreatePickupRequestInput {
  items: { category: WasteCategory; loadSize: LoadSize }[];
  timeSlotStart: string;
  timeSlotEnd: string;
  placeId: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
}

export function createPickupRequest(input: CreatePickupRequestInput): Promise<{ pickup: PickupRequestDetail }> {
  return authFetch<{ pickup: PickupRequestDetail }>("/pickups", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { "x-csrf-token": readCsrfToken() },
  });
}

export function cancelPickupRequest(pickupRequestId: string): Promise<{ pickup: PickupRequestSummary }> {
  return authFetch<{ pickup: PickupRequestSummary }>(`/pickups/${encodeURIComponent(pickupRequestId)}/cancel`, {
    method: "POST",
    headers: { "x-csrf-token": readCsrfToken() },
  });
}

export function listOpenPickups(): Promise<{ pickups: PickupRequestSummary[] }> {
  return authFetch<{ pickups: PickupRequestSummary[] }>("/pickups/open", { method: "GET" });
}

// --- Smart Pickup Reminder ---

export interface PickupReminderSummary {
  hasPattern: boolean;
  averageIntervalDays: number | null;
  lastPickupDate: string | null;
  daysSinceLastPickup: number | null;
  isDue: boolean;
  message: string | null;
}

export function getPickupReminderSummary(): Promise<PickupReminderSummary> {
  return authFetch<PickupReminderSummary>("/pickups/reminders/summary", { method: "GET" });
}

export function listAssignedPickups(): Promise<{ pickups: PickupRequestSummary[] }> {
  return authFetch<{ pickups: PickupRequestSummary[] }>("/pickups/assigned", { method: "GET" });
}

export interface PickupOffer {
  id: string;
  pickupRequestId: string;
  bidAmount: number;
  bidAmountsPerKg?: Record<string, number> | null;
  message: string | null;
  status: OfferStatus;
  createdAt: string;
  updatedAt: string;
  collector: {
    id: string;
    fullName: string;
    vehicleType: VehicleType | null;
    /** A Cloudinary public_id, not a full URL — resolve via `resolveAvatarUrl` before rendering. */
    avatarUrl: string | null;
  };
}

export function getPickupOffers(pickupRequestId: string): Promise<{ offers: PickupOffer[] }> {
  return authFetch<{ offers: PickupOffer[] }>(`/pickups/${encodeURIComponent(pickupRequestId)}/offers`, {
    method: "GET",
  });
}
