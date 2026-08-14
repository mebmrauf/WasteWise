import { authFetch } from "./auth";
import { type VehicleType } from "../vehicleType";

export type CollectorSortBy = "distance" | "rating";

export interface CollectorDirectoryEntry {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  phone: string | null;
  averageRating: number | null;
  totalRatings: number;
  vehicleType: VehicleType;
  serviceArea: string;
  distanceKm: number | null;
}

export interface GetVerifiedCollectorsParams {
  vehicleType?: VehicleType;
  latitude?: number;
  longitude?: number;
  minRating?: number;
  sortBy?: CollectorSortBy;
}

export async function getVerifiedCollectors(params: GetVerifiedCollectorsParams): Promise<CollectorDirectoryEntry[]> {
  const paramsStr = new URLSearchParams();
  if (params.vehicleType) paramsStr.set("vehicleType", params.vehicleType);
  if (params.latitude !== undefined) paramsStr.set("latitude", String(params.latitude));
  if (params.longitude !== undefined) paramsStr.set("longitude", String(params.longitude));
  if (params.minRating !== undefined) paramsStr.set("minRating", String(params.minRating));
  if (params.sortBy) paramsStr.set("sortBy", params.sortBy);

  const query = paramsStr.toString() ? `?${paramsStr.toString()}` : "";
  return authFetch<CollectorDirectoryEntry[]>(`/collectors${query}`, { method: "GET" });
}
