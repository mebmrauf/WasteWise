import { authFetch } from "./auth";

export interface CsrContribution {
  id: string;
  businessId: string;
  pickupId: string;
  donationAmount: number;
  donationPercentage: number | null;
  selectedCause: string;
  paymentAmount: number;
  createdAt: string;
  updatedAt: string;
  pickup?: {
    id: string;
    createdAt: string;
  };
}

export interface CreateCsrContributionInput {
  pickupId: string;
  donationAmount: number;
  donationPercentage?: number | null;
  selectedCause: string;
  paymentAmount: number;
}

export interface CsrDashboardStats {
  totalDonated: number;
  totalContributions: number;
  mostSupportedCause: string | null;
  causeDistribution: Record<string, number>;
  lastContribution: CsrContribution | null;
}

export async function createCsrContribution(input: CreateCsrContributionInput): Promise<{ contribution: CsrContribution }> {
  return await authFetch<{ contribution: CsrContribution }>("/csr/contributions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function getCsrDashboard(): Promise<{ stats: CsrDashboardStats }> {
  return await authFetch<{ stats: CsrDashboardStats }>("/csr/dashboard");
}

export async function getCsrHistory(): Promise<{ contributions: CsrContribution[] }> {
  return await authFetch<{ contributions: CsrContribution[] }>("/csr/history");
}

export async function getCsrReceipt(id: string): Promise<{ contribution: any }> {
  return await authFetch<{ contribution: any }>(`/csr/receipt/${id}`);
}
