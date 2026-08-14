import { authFetch } from "./auth";
import { type VehicleType } from "../vehicleType";

export interface CollectorDirectoryEntry {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  phone: string | null;
  averageRating: number | null;
  totalRatings: number;
  vehicleType: VehicleType;
  serviceArea: string;
  serviceAreaFormattedAddress: string | null;
  distanceKm: number | null;
}

export type CollectorSort = "nearest" | "rating";

export interface GetVerifiedCollectorsParams {
  serviceArea?: string;
  vehicleType?: VehicleType;
  lat?: number;
  lng?: number;
  minRating?: number;
  sort?: CollectorSort;
}

export async function getVerifiedCollectors(params: GetVerifiedCollectorsParams): Promise<CollectorDirectoryEntry[]> {
  const paramsStr = new URLSearchParams();
  if (params.serviceArea) paramsStr.set("serviceArea", params.serviceArea);
  if (params.vehicleType) paramsStr.set("vehicleType", params.vehicleType);
  if (params.lat !== undefined) paramsStr.set("lat", String(params.lat));
  if (params.lng !== undefined) paramsStr.set("lng", String(params.lng));
  if (params.minRating !== undefined) paramsStr.set("minRating", String(params.minRating));
  if (params.sort) paramsStr.set("sort", params.sort);

  const query = paramsStr.toString() ? `?${paramsStr.toString()}` : "";
  return authFetch<CollectorDirectoryEntry[]>(`/collectors${query}`, { method: "GET" });
}
