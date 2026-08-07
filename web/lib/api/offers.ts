import { authFetch, readCsrfToken } from "./auth";
import type { OfferStatus } from "@/lib/offerStatus";

export interface OfferSummary {
  id: string;
  pickupRequestId: string;
  collectorId: string;
  bidAmount: number;
  message: string | null;
  status: OfferStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitOfferInput {
  pickupRequestId: string;
  bidAmount: number;
  message?: string;
}

export function submitOffer(input: SubmitOfferInput): Promise<{ offer: OfferSummary }> {
  return authFetch<{ offer: OfferSummary }>("/offers", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { "x-csrf-token": readCsrfToken() },
  });
}

export interface AcceptedOfferPickupSummary {
  id: string;
  status: "ASSIGNED";
  assignedCollectorId: string;
  updatedAt: string;
}

export function acceptOffer(
  offerId: string,
): Promise<{ offer: OfferSummary; pickup: AcceptedOfferPickupSummary }> {
  return authFetch<{ offer: OfferSummary; pickup: AcceptedOfferPickupSummary }>(
    `/offers/${encodeURIComponent(offerId)}/accept`,
    {
      method: "POST",
      headers: { "x-csrf-token": readCsrfToken() },
    },
  );
}
