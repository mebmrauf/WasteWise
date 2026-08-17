import { authFetch, readCsrfToken } from "./auth";

export type ComplaintStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";

export interface Complaint {
  id: string;
  pickupRequestId: string | null;
  bulkRequestId: string | null;
  complainantId: string;
  againstUserId: string | null;
  description: string;
  status: ComplaintStatus;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  resolvedByAdminId: string | null;
  photos: string[];
  createdAt: string;
  updatedAt: string;
  againstUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  complainant?: {
    id: string;
    fullName: string;
    email: string;
    role?: string;
  } | null;
  pickupRequest?: {
    id: string;
    status: string;
    timeSlotStart?: string;
    timeSlotEnd?: string;
    pickupFormattedAddress?: string;
  } | null;
  bulkRequest?: {
    id: string;
    status: string;
    pickupAddress?: string;
  } | null;
  resolvedByAdmin?: {
    id: string;
    fullName: string;
  } | null;
}

export async function createComplaint(data: FormData): Promise<{ complaint: Complaint }> {
  return authFetch<{ complaint: Complaint }>("/complaints", {
    method: "POST",
    body: data,
    headers: {
      "x-csrf-token": readCsrfToken(),
    },
  });
}

export async function getMyComplaints(): Promise<{ complaints: Complaint[] }> {
  return authFetch<{ complaints: Complaint[] }>("/complaints");
}
