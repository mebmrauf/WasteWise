import { authFetch, readCsrfToken } from "./auth";
import type { MobileOperator } from "@/components/OperatorSelector";
import type { SimType } from "@/components/SimTypeToggle";
import type { MobileRechargeStatus } from "@/lib/rechargeStatus";

export function getRewardsBalance(): Promise<{ greenPointsBalance: number }> {
  return authFetch<{ greenPointsBalance: number }>("/rewards/balance", { method: "GET" });
}

export interface GreenPointsTransaction {
  id: string;
  pickupRequestId: string | null;
  points: number;
  type: "EARNED" | "REDEEMED";
  description: string;
  createdAt: string;
}

export interface MobileRechargeTransaction {
  id: string;
  operator: MobileOperator;
  simType: SimType;
  phoneNumber: string;
  amountTaka: number;
  pointsSpent: number;
  status: MobileRechargeStatus;
  createdAt: string;
}

export function getRewardsHistory(): Promise<{
  greenPointsTransactions: GreenPointsTransaction[];
  mobileRechargeTransactions: MobileRechargeTransaction[];
}> {
  return authFetch<{
    greenPointsTransactions: GreenPointsTransaction[];
    mobileRechargeTransactions: MobileRechargeTransaction[];
  }>("/rewards/history", { method: "GET" });
}

export interface SubmitRechargeInput {
  operator: MobileOperator;
  simType: SimType;
  phoneNumber: string;
  amountTaka: number;
}

export interface RechargeAttempt {
  id: string;
  operator: MobileOperator;
  simType: SimType;
  phoneNumber: string;
  amountTaka: number;
  pointsSpent: number;
  status: MobileRechargeStatus;
  createdAt: string;
}

export interface SubmitRechargeResult {
  recharge: RechargeAttempt;
  greenPointsBalance: number;
}

export function submitRecharge(input: SubmitRechargeInput): Promise<SubmitRechargeResult> {
  return authFetch<SubmitRechargeResult>("/rewards/recharge", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { "x-csrf-token": readCsrfToken() },
  });
}
