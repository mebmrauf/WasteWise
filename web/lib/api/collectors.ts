import { authFetch } from "./auth";
import { type VehicleType } from "../vehicleType";

export interface CollectorDirectoryEntry {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  averageRating: number | null;
  totalRatings: number;
  vehicleType: VehicleType;
  serviceArea: string;
}

export interface GetVerifiedCollectorsParams {
  serviceArea?: string;
  vehicleType?: VehicleType;
}

export async function getVerifiedCollectors(params: GetVerifiedCollectorsParams): Promise<CollectorDirectoryEntry[]> {
  const paramsStr = new URLSearchParams();
  if (params.serviceArea) paramsStr.set("serviceArea", params.serviceArea);
  if (params.vehicleType) paramsStr.set("vehicleType", params.vehicleType);
  
  const query = paramsStr.toString() ? `?${paramsStr.toString()}` : "";
  return authFetch<CollectorDirectoryEntry[]>(`/collectors${query}`, { method: "GET" });
}
