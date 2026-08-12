import { authFetch, readCsrfToken } from "./auth";
import type { MobileOperator } from "@/components/OperatorSelector";
import type { SimType } from "@/components/SimTypeToggle";
import type { MobileRechargeStatus } from "@/lib/rechargeStatus";

export interface RewardsBalance {
  greenPointsBalance: number;
  totalGreenPoints: number;
  membershipLevel: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  membershipBadge: string;
  lastDiscountClaimDate: string | null;
  nextDiscountEligibleDate: string | null;
  discountCouponClaimed: boolean;
  selectedGift: string | null;
  giftClaimDate: string | null;
  nextGiftEligibleDate: string | null;
  giftClaimed: boolean;
  accountType: "HOUSEHOLD" | "BUSINESS" | null;
  environmentalImpact: { totalWasteRecycledKg: number; totalCo2ReducedKg: number; totalTreesSaved: number } | null;
}

export function getRewardsBalance(): Promise<RewardsBalance> {
  return authFetch<RewardsBalance>("/rewards/balance", { method: "GET" });
}

export interface RewardReason {
  materials: { category: string; weight: number; points: number }[];
  bonuses: { name: string; points: number }[];
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
}

export type TransactionCategory = "PICKUP" | "BONUS" | "REFERRAL" | "LOYALTY" | "REDEMPTION" | "OTHER";

export interface GreenPointsTransaction {
  id: string;
  pickupRequestId: string | null;
  points: number;
  basePoints: number | null;
  bonusPoints: number | null;
  totalPoints: number | null;
  category?: TransactionCategory;
  rewardReason: RewardReason | null;
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
  membershipLevel: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  membershipBadge: string;
}

export function submitRecharge(input: SubmitRechargeInput): Promise<SubmitRechargeResult> {
  return authFetch<SubmitRechargeResult>("/rewards/recharge", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { "x-csrf-token": readCsrfToken() },
  });
}

export interface ClaimPlatinumGiftResult {
  selectedGift: string;
  giftClaimDate: string;
  nextGiftEligibleDate: string;
  giftClaimed: boolean;
}

export function claimPlatinumGift(gift: string): Promise<ClaimPlatinumGiftResult> {
  return authFetch<ClaimPlatinumGiftResult>("/rewards/claim-gift", {
    method: "POST",
    body: JSON.stringify({ gift }),
    headers: { "x-csrf-token": readCsrfToken() },
  });
}

export interface ClaimDiscountResult {
  lastDiscountClaimDate: string;
  nextDiscountEligibleDate: string;
  discountCouponClaimed: boolean;
}

export function claimDiscount(): Promise<ClaimDiscountResult> {
  return authFetch<ClaimDiscountResult>("/rewards/claim-discount", {
    method: "POST",
    headers: { "x-csrf-token": readCsrfToken() },
  });
}
