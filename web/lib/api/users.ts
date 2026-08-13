import { publicEnv } from "../env";
import { authFetch, readCsrfToken, type AccountType, type Role } from "./auth";
import type { VehicleType } from "../vehicleType";

export type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface CollectorProfileSummary {
  vehicleType: VehicleType;
  vehicleNumber: string;
  licenseNumber: string;
  serviceArea: string;
  serviceAreaPlaceId: string | null;
  serviceAreaFormattedAddress: string | null;
  serviceAreaLatitude: number | null;
  serviceAreaLongitude: number | null;
  serviceAreaRadiusKm: number | null;
  verificationStatus: VerificationStatus;
  verificationRejectionReason: string | null;
  averageRating: number | null;
  totalRatings: number;
}

export interface UserProfile {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  role: Role;
  accountType: AccountType | null;
  isEmailVerified: boolean;
  formattedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  avatarUrl: string | null;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  collectorProfile: CollectorProfileSummary | null;
}

export function getMyProfile(): Promise<{ user: UserProfile }> {
  return authFetch<{ user: UserProfile }>("/users/me", { method: "GET" });
}

export interface UpdateProfileInput {
  fullName?: string;
  phone?: string;
  placeId?: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
  emailNotificationsEnabled?: boolean;
  smsNotificationsEnabled?: boolean;
}

export function updateMyProfile(input: UpdateProfileInput): Promise<{ user: UserProfile }> {
  return authFetch<{ user: UserProfile }>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(input),
    headers: { "x-csrf-token": readCsrfToken() },
  });
}

export function uploadMyAvatar(file: File): Promise<{ user: UserProfile }> {
  const formData = new FormData();
  formData.append("avatar", file);
  return authFetch<{ user: UserProfile }>("/users/me/avatar", {
    method: "POST",
    body: formData,
    headers: { "x-csrf-token": readCsrfToken() },
  });
}

const AVATAR_TRANSFORM = "c_fill,g_face,w_256,h_256,q_auto,f_auto";

export function resolveAvatarUrl(avatarUrl: string | null): string | null {
  if (!avatarUrl) return null;
  return `https://res.cloudinary.com/${publicEnv.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${AVATAR_TRANSFORM}/${avatarUrl}`;
}

export interface UpdateCollectorProfileInput {
  vehicleType: VehicleType;
  vehicleNumber: string;
  licenseNumber: string;
  serviceArea: string;
  serviceAreaPlaceId?: string;
  serviceAreaFormattedAddress?: string;
  serviceAreaLatitude?: number;
  serviceAreaLongitude?: number;
  serviceAreaRadiusKm?: number;
}

export function updateCollectorProfile(
  input: UpdateCollectorProfileInput,
): Promise<{ collectorProfile: CollectorProfileSummary }> {
  return authFetch<{ collectorProfile: CollectorProfileSummary }>("/users/me/collector-profile", {
    method: "PATCH",
    body: JSON.stringify(input),
    headers: { "x-csrf-token": readCsrfToken() },
  });
}
