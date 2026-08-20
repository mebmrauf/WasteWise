import { authFetch } from "./auth";

export interface BulkMarketplaceRequest {
  id: string;
  businessId: string;
  assignedCompanyId: string | null;
  wasteTypes: string[];
  estimatedWeightKg: number;
  pickupAddress: string;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  preferredPickupDate: string;
  bidEndsAt: string | null;
  images: string[];
  additionalNotes: string | null;
  status: "OPEN_FOR_BIDDING" | "BIDDING_CLOSED" | "RECYCLING_COMPANY_ASSIGNED" | "EN_ROUTE" | "ARRIVED" | "IN_PROGRESS" | "VERIFYING_WEIGHTS" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
  business?: {
    fullName: string;
    avatarUrl: string | null;
  };
  assignedCompany?: {
    fullName: string;
    avatarUrl: string | null;
    recyclingCompanyProfile: any;
  };
  _count?: {
    quotations: number;
  };
  verifiedWeights?: Record<string, number>;
  verifiedTotalWeightKg?: number;
  collectionPhotos?: string[];
  rating?: { score: number; comment?: string | null } | null;
  csrContributions?: { id: string }[];
  quotations?: MarketplaceQuotation[];
  hasPayment?: boolean;
}

export interface MarketplaceQuotation {
  id: string;
  requestId: string;
  companyId: string;
  purchasePrice: number;
  vehicleType: string;
  estimatedPickupDate: string;
  estimatedPickupTime: string | null;
  additionalNotes: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  isHighestBid?: boolean;
  createdAt: string;
  updatedAt: string;
  pricesPerKg?: Record<string, number> | null;
  company?: {
    fullName: string;
    avatarUrl: string | null;
    recyclingCompanyProfile: any;
  };
  request?: BulkMarketplaceRequest;
}

export async function createBulkRequest(payload: {
  wasteTypes: { category: string; weightKg: number }[];
  estimatedWeightKg: number;
  pickupAddress: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
  preferredPickupDate: string;
  images: string[];
  additionalNotes?: string;
}): Promise<BulkMarketplaceRequest> {
  const res = await authFetch<{request: BulkMarketplaceRequest}>("/marketplace/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.request;
}

export async function getMarketplaceRequests(): Promise<BulkMarketplaceRequest[]> {
  const res = await authFetch<{requests: BulkMarketplaceRequest[]}>("/marketplace/requests", {
    method: "GET",
  });
  return res.requests;
}

export async function getMarketplaceRequest(id: string): Promise<BulkMarketplaceRequest> {
  const res = await authFetch<{request: BulkMarketplaceRequest}>(`/marketplace/requests/${id}`, {
    method: "GET",
  });
  return res.request;
}

export async function submitQuotation(
  requestId: string,
  payload: {
    purchasePrice: number;
    vehicleType: string;
    estimatedPickupDate: string;
    estimatedPickupTime?: string;
    additionalNotes?: string;
    pricesPerKg?: Record<string, number>;
  }
): Promise<MarketplaceQuotation> {
  const res = await authFetch<{quotation: MarketplaceQuotation}>(`/marketplace/requests/${requestId}/quotations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.quotation;
}

export async function getQuotations(requestId: string): Promise<MarketplaceQuotation[]> {
  const res = await authFetch<{quotations: MarketplaceQuotation[]}>(`/marketplace/requests/${requestId}/quotations`, {
    method: "GET",
  });
  return res.quotations;
}

export async function acceptQuotation(requestId: string, quoteId: string): Promise<void> {
  await authFetch<void>(`/marketplace/requests/${requestId}/quotations/${quoteId}/accept`, {
    method: "POST",
  });
}

export async function rejectHighestQuotation(requestId: string, quoteId: string): Promise<void> {
  await authFetch<void>(`/marketplace/requests/${requestId}/quotations/${quoteId}/reject`, {
    method: "POST",
  });
}

export async function getMyQuotations(): Promise<MarketplaceQuotation[]> {
  const res = await authFetch<{ quotations: MarketplaceQuotation[] }>("/marketplace/quotations/my", {
    method: "GET",
  });
  return res.quotations;
}

export async function updateBulkRequestStatus(requestId: string, status: string): Promise<void> {
  await authFetch<void>(`/marketplace/requests/${requestId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export async function submitBulkCollectionProof(
  requestId: string,
  payload: {
    verifiedWeights: Record<string, number>;
    verifiedTotalWeightKg: number;
    collectionPhotos?: string[];
    notes?: string;
  }
): Promise<void> {
  await authFetch<void>(`/marketplace/requests/${requestId}/submit-proof`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function confirmBulkCollection(requestId: string): Promise<void> {
  await authFetch<void>(`/marketplace/requests/${requestId}/confirm`, {
    method: "POST",
  });
}

export async function rateBulkCollection(requestId: string, rating: number, review?: string): Promise<void> {
  await authFetch<void>(`/marketplace/requests/${requestId}/rate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating, review }),
  });
}
