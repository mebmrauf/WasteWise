import { authFetch } from "./auth";

export interface PaymentRecord {
  id: string;
  pickupId: string | null;
  bulkRequestId: string | null;
  customerId: string;
  payerId: string;
  amount: number;
  paymentMethod: "CASH" | "CARD" | "MOBILE_BANKING" | "SSLCOMMERZ" | "COD" | "NOT_SELECTED";
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
  transactionId: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    fullName: string;
    accountType: "HOUSEHOLD" | "BUSINESS" | null;
    email: string;
  };
  payer: {
    fullName: string;
    accountType: "HOUSEHOLD" | "BUSINESS" | null;
    email: string;
  };
  pickup?: { id: string; createdAt: string; } | null;
  bulkRequest?: { id: string; createdAt: string; } | null;
}

export function listPaymentsHistory(): Promise<PaymentRecord[]> {
  return authFetch<PaymentRecord[]>("/payments/history", { method: "GET" });
}
