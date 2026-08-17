import { authFetch, readCsrfToken } from "./auth";
import type { AuthUser } from "./auth";
import type { VerificationStatus } from "./users";

export interface PublicCollectorProfile {
  vehicleType: string;
  vehicleNumber: string;
  licenseNumber: string;
  serviceArea: string;
  verificationStatus: VerificationStatus;
  verificationRejectionReason: string | null;
  averageRating: number | null;
  totalRatings: number;
}

export interface CollectorWithUser extends PublicCollectorProfile {
  user: Pick<AuthUser, "id" | "email" | "phone" | "fullName">;
}

export function getCollectors(): Promise<{ collectors: CollectorWithUser[] }> {
  return authFetch<{ collectors: CollectorWithUser[] }>("/admin/collectors");
}

export function verifyCollector(id: string, action: "APPROVE" | "REJECT", rejectionReason?: string): Promise<{ collector: CollectorWithUser }> {
  return authFetch<{ collector: CollectorWithUser }>(`/admin/collectors/${id}/verify`, {
    method: "PATCH",
    body: JSON.stringify({ action, rejectionReason }),
    headers: { "x-csrf-token": readCsrfToken() },
  });
}

export interface PublicRecyclingCompanyProfile {
  companyName: string;
  tradeLicenseNumber: string | null;
  district: string;
  serviceAreas: string[];
  acceptedWasteMaterials: string[];
  currentInventoryKg: number;
  verificationStatus: VerificationStatus;
}

export interface RecyclingCompanyWithUser extends PublicRecyclingCompanyProfile {
  user: Pick<AuthUser, "id" | "email" | "phone" | "fullName">;
}

export function getRecyclingCompanies(): Promise<{ recyclingCompanies: RecyclingCompanyWithUser[] }> {
  return authFetch<{ recyclingCompanies: RecyclingCompanyWithUser[] }>("/admin/recycling-companies");
}

export function verifyRecyclingCompany(
  id: string,
  action: "APPROVE" | "REJECT",
  rejectionReason?: string,
): Promise<{ recyclingCompany: RecyclingCompanyWithUser }> {
  return authFetch<{ recyclingCompany: RecyclingCompanyWithUser }>(`/admin/recycling-companies/${id}/verify`, {
    method: "PATCH",
    body: JSON.stringify({ action, rejectionReason }),
    headers: { "x-csrf-token": readCsrfToken() },
  });
}

export interface PublicBusinessProfile {
  businessName: string;
  tradeLicenseNumber: string | null;
  verificationStatus: VerificationStatus;
}

export interface BusinessWithUser extends PublicBusinessProfile {
  user: Pick<AuthUser, "id" | "email" | "phone" | "fullName">;
}

export function getBusinesses(): Promise<{ businesses: BusinessWithUser[] }> {
  return authFetch<{ businesses: BusinessWithUser[] }>("/admin/businesses");
}

export function verifyBusiness(
  id: string,
  action: "APPROVE" | "REJECT",
  rejectionReason?: string,
): Promise<{ business: BusinessWithUser }> {
  return authFetch<{ business: BusinessWithUser }>(`/admin/businesses/${id}/verify`, {
    method: "PATCH",
    body: JSON.stringify({ action, rejectionReason }),
    headers: { "x-csrf-token": readCsrfToken() },
  });
}

import type { Complaint } from "./complaints";

export function getAllComplaints(): Promise<{ complaints: Complaint[] }> {
  return authFetch<{ complaints: Complaint[] }>("/admin/complaints");
}

export function updateComplaintStatus(
  id: string,
  status: string,
  resolutionNotes?: string,
): Promise<{ complaint: Complaint }> {
  return authFetch<{ complaint: Complaint }>(`/admin/complaints/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, resolutionNotes }),
    headers: { "x-csrf-token": readCsrfToken() },
  });
}
