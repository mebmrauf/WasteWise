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

export interface RecyclingCompanyProfileSummary {
  companyName: string;
  tradeLicenseNumber: string | null;
  district: string;
  serviceAreas: string[];
  acceptedWasteMaterials: string[];
  currentInventoryKg: number;
  verificationStatus: VerificationStatus;
}

export interface BusinessProfileSummary {
  businessName: string;
  tradeLicenseNumber: string | null;
  verificationStatus: VerificationStatus;
}

export interface UserProfile {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  role: Role;
  accountType: AccountType | null;
  isEmailVerified: boolean;
  hasPassword: boolean;
  formattedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  avatarUrl: string | null;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  rewardsEmailNotificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  collectorProfile: CollectorProfileSummary | null;
  recyclingCompanyProfile: RecyclingCompanyProfileSummary | null;
  businessProfile: BusinessProfileSummary | null;
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
  rewardsEmailNotificationsEnabled?: boolean;
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

export interface UpdateBusinessProfileInput {
  businessName?: string;
  tradeLicenseNumber?: string | null;
}

export function updateBusinessProfile(
  input: UpdateBusinessProfileInput,
): Promise<{ businessProfile: BusinessProfileSummary }> {
  return authFetch<{ businessProfile: BusinessProfileSummary }>("/users/me/business-profile", {
    method: "PATCH",
    body: JSON.stringify(input),
    headers: { "x-csrf-token": readCsrfToken() },
  });
}

export interface ChangePasswordInput {
  currentPassword?: string;
  newPassword: string;
}

export function changeMyPassword(input: ChangePasswordInput): Promise<{ success: boolean }> {
  return authFetch<{ success: boolean }>("/users/me/password", {
    method: "PATCH",
    body: JSON.stringify(input),
    headers: { "x-csrf-token": readCsrfToken() },
  });
}

export interface DeleteAccountInput {
  password?: string;
}

export function deleteMyAccount(input: DeleteAccountInput = {}): Promise<{ success: boolean }> {
  return authFetch<{ success: boolean }>("/users/me", {
    method: "DELETE",
    body: JSON.stringify(input),
    headers: { "x-csrf-token": readCsrfToken() },
  });
}

export interface CollectorRating {
  id: string;
  score: number;
  comment: string | null;
  createdAt: string;
}

export function getMyRatings(): Promise<{ ratings: CollectorRating[] }> {
  return authFetch<{ ratings: CollectorRating[] }>("/users/me/ratings", {
    method: "GET",
  });
}

export interface CollectorCategoryStat {
  category: string;
  weight: number;
}

export interface CollectorDailyStat {
  date: string;
  weight: number;
}

export function getMyStats(): Promise<{ categoryStats: CollectorCategoryStat[]; dailyStats: CollectorDailyStat[] }> {
  return authFetch<{ categoryStats: CollectorCategoryStat[]; dailyStats: CollectorDailyStat[] }>("/users/me/stats", {
    method: "GET",
  });
}
