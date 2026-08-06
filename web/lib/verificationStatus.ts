import type { VerificationStatus } from "./api/users";

export type VerificationStatusTone = "success" | "warning" | "error";

export const VERIFICATION_STATUS_TONE: Record<VerificationStatus, VerificationStatusTone> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
};

export const VERIFICATION_STATUS_LABEL: Record<VerificationStatus, string> = {
  PENDING: "Verification pending",
  APPROVED: "Verified",
  REJECTED: "Verification rejected",
};
