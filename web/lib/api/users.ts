import { publicEnv } from "../env";
import { authFetch, readCsrfToken, type AccountType, type Role } from "./auth";
import type { VehicleType } from "../vehicleType";

export type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface CollectorProfileSummary {
  vehicleType: VehicleType;
  licenseNumber: string | null;
  serviceArea: string | null;
  verificationStatus: VerificationStatus;
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

export function getApiOrigin(): string {
  return new URL(publicEnv.NEXT_PUBLIC_API_URL).origin;
}

export function resolveAvatarUrl(avatarUrl: string | null): string | null {
  if (!avatarUrl) return null;
  return `${getApiOrigin()}${avatarUrl}`;
}

export interface UpdateCollectorProfileInput {
  vehicleType: VehicleType;
  licenseNumber?: string;
  serviceArea?: string;
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
