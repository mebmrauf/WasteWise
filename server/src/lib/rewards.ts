import { MobileOperator } from "@prisma/client";

export const POINTS_PER_PICKUP = 50;

export const MIN_RECHARGE_TAKA = 20;

export const MAX_RECHARGE_TAKA = 100_000;

export const POINTS_PER_TAKA = 10;

export function calculatePointsForRecharge(amountTaka: number): number {
  return amountTaka * POINTS_PER_TAKA;
}

export const OPERATOR_PHONE_PREFIXES: Record<MobileOperator, readonly string[]> = {
  GRAMEENPHONE: ["017", "013"],
  BANGLALINK: ["019", "014"],
  ROBI: ["018"],
  AIRTEL: ["016"],
  TELETALK: ["015"],
};

export function isPhoneNumberValidForOperator(
  phoneNumber: string,
  operator: MobileOperator,
): boolean {
  const prefixes = OPERATOR_PHONE_PREFIXES[operator];
  const digitsOnly = phoneNumber.replace(/\D/g, "");
  const localNumber = digitsOnly.slice(-11);
  const prefix = localNumber.slice(0, 3);
  return prefixes.includes(prefix);
}
