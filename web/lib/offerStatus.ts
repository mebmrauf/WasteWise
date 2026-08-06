export type OfferStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";

export type OfferStatusTone = "warning" | "info" | "success" | "error";

export const OFFER_STATUS_TONE: Record<OfferStatus, OfferStatusTone> = {
  PENDING: "warning",
  ACCEPTED: "success",
  REJECTED: "error",
  WITHDRAWN: "error",
};

export const OFFER_STATUS_LABEL: Record<OfferStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};
