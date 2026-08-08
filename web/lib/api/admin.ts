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
