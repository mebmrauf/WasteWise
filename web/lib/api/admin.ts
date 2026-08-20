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

export interface WasteAnalysisReport {
  id: string;
  pickupRequestId: string | null;
  bulkRequestId: string | null;
  requesterId: string;
  photoUrls: string[];
  description: string | null;
  detectedCondition: string | null;
  estimatedUsagePeriod: string | null;
  suggestedCategory: string | null;
  confidence: number | null;
  aiSummary: string | null;
  needsAdminReview: boolean;
  reviewReason: string | null;
  reviewStatus: "PENDING" | "REVIEWED" | "DISMISSED";
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  requester: Pick<AuthUser, "id" | "fullName" | "email"> & { accountType: string | null; role: string };
  pickupRequest: { id: string; status: string; pickupDate: string; pickupFormattedAddress: string } | null;
  bulkRequest: { id: string; status: string; pickupAddress: string } | null;
  reviewedByAdmin: { id: string; fullName: string } | null;
}

export function getWasteAnalysisReports(): Promise<{ reports: WasteAnalysisReport[] }> {
  return authFetch<{ reports: WasteAnalysisReport[] }>("/admin/waste-analysis-reports");
}

export interface WasteAnalysisSummaryBucket {
  byCategory: Record<string, number>;
  byCondition: Record<string, number>;
  byUsagePeriod: Record<string, number>;
}

export interface WasteAnalysisSummary {
  HOUSEHOLD: WasteAnalysisSummaryBucket;
  BUSINESS: WasteAnalysisSummaryBucket;
}

/** Up to 20 highest-confidence classified examples per category, per requester bucket — only ones with a photo. */
export interface WasteAnalysisTopClassified {
  HOUSEHOLD: Record<string, WasteAnalysisReport[]>;
  BUSINESS: Record<string, WasteAnalysisReport[]>;
}

export function getWasteAnalysisSummary(): Promise<{ summary: WasteAnalysisSummary; topClassified: WasteAnalysisTopClassified }> {
  return authFetch<{ summary: WasteAnalysisSummary; topClassified: WasteAnalysisTopClassified }>("/admin/waste-analysis-summary");
}

/** Dismissing deletes the report outright (see server/src/routes/admin.ts) — `report` is only present when reviewed. */
export function updateWasteAnalysisReview(
  id: string,
  status: "REVIEWED" | "DISMISSED",
  reviewNotes?: string,
): Promise<{ deleted: boolean; report?: WasteAnalysisReport }> {
  return authFetch<{ deleted: boolean; report?: WasteAnalysisReport }>(`/admin/waste-analysis-reports/${id}/review`, {
    method: "PATCH",
    body: JSON.stringify({ status, reviewNotes }),
    headers: { "x-csrf-token": readCsrfToken() },
  });
}

export function deleteWasteAnalysisReports(ids: string[]): Promise<{ deletedCount: number }> {
  return authFetch<{ deletedCount: number }>("/admin/waste-analysis-reports", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
    headers: { "x-csrf-token": readCsrfToken() },
  });
}
