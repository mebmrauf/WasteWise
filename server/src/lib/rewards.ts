import { MobileOperator, WasteCategory, PrismaClient, MembershipLevel } from "@prisma/client";
import { prisma } from "./prisma";

export const MIN_RECHARGE_TAKA = 20;

export const MAX_RECHARGE_TAKA = 100_000;

export const POINTS_PER_TAKA = 10;

export const POINTS_PER_KG: Record<WasteCategory, number> = {
  PAPER: 6,
  ORGANIC: 4,
  PLASTIC: 8,
  GLASS: 4,
  METAL: 10,
  ELECTRONIC: 20,
  OTHER: 2,
};

export const BONUS_POINTS = {
  FIRST_PICKUP_MONTH: 10,
  HEAVY_RECYCLING: 20,
  E_WASTE: 15,
  MONTHLY_MILESTONE: 30,
};

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

export function calculateBaseGreenPoints(
  items: { category: WasteCategory; exactWeightKg: number }[],
) {
  let totalBasePoints = 0;
  const materialsBreakdown: { category: WasteCategory; weight: number; points: number }[] = [];

  for (const item of items) {
    const pointsPerKg = POINTS_PER_KG[item.category] ?? POINTS_PER_KG.OTHER;
    const points = Math.round(item.exactWeightKg * pointsPerKg);
    totalBasePoints += points;
    materialsBreakdown.push({
      category: item.category,
      weight: item.exactWeightKg,
      points,
    });
  }

  return { totalBasePoints, materialsBreakdown };
}

export function calculateBonusPoints(
  items: { category: WasteCategory; exactWeightKg: number }[],
  isFirstPickupThisMonth: boolean,
  isFifthPickupThisMonth: boolean,
) {
  let totalBonusPoints = 0;
  const bonusesBreakdown: { name: string; points: number }[] = [];
  const totalWeight = items.reduce((sum, item) => sum + item.exactWeightKg, 0);

  if (isFirstPickupThisMonth) {
    totalBonusPoints += BONUS_POINTS.FIRST_PICKUP_MONTH;
    bonusesBreakdown.push({ name: "First Pickup of Month", points: BONUS_POINTS.FIRST_PICKUP_MONTH });
  }

  if (totalWeight >= 20) {
    totalBonusPoints += BONUS_POINTS.HEAVY_RECYCLING;
    bonusesBreakdown.push({ name: "Heavy Recycling", points: BONUS_POINTS.HEAVY_RECYCLING });
  }

  const hasEwaste = items.some((item) => item.category === "ELECTRONIC");
  if (hasEwaste) {
    totalBonusPoints += BONUS_POINTS.E_WASTE;
    bonusesBreakdown.push({ name: "E-waste Bonus", points: BONUS_POINTS.E_WASTE });
  }

  if (isFifthPickupThisMonth) {
    totalBonusPoints += BONUS_POINTS.MONTHLY_MILESTONE;
    bonusesBreakdown.push({ name: "Monthly Recycling Milestone", points: BONUS_POINTS.MONTHLY_MILESTONE });
  }

  return { totalBonusPoints, bonusesBreakdown };
}

export function calculateMembershipLevel(totalPoints: number, accountType: string | null = "HOUSEHOLD"): MembershipLevel {
  if (accountType === "BUSINESS") {
    if (totalPoints >= 4500) return "PLATINUM";
    if (totalPoints >= 3001) return "GOLD";
    if (totalPoints >= 1501) return "SILVER";
    return "BRONZE";
  } else {
    if (totalPoints >= 3000) return "PLATINUM";
    if (totalPoints >= 1501) return "GOLD";
    if (totalPoints >= 501) return "SILVER";
    return "BRONZE";
  }
}

export function getMembershipBonusPercentage(level: MembershipLevel): number {
  switch (level) {
    case "PLATINUM":
      return 15;
    case "GOLD":
      return 10;
    case "SILVER":
      return 5;
    case "BRONZE":
    default:
      return 0;
  }
}

export function getMembershipBadge(level: MembershipLevel): string {
  switch (level) {
    case "PLATINUM":
      return "Platinum Badge";
    case "GOLD":
      return "Gold Badge";
    case "SILVER":
      return "Silver Badge";
    case "BRONZE":
    default:
      return "Bronze Badge";
  }
}

export async function getMonthlyPickupCount(userId: string, tx?: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) {
  const db = tx ?? prisma;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return db.pickupRequest.count({
    where: {
      requesterId: userId,
      status: "COMPLETED",
      updatedAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  });
}

export async function calculateGreenPointsForPickup(
  userId: string,
  items: { category: WasteCategory; exactWeightKg: number }[],
  tx?: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">
) {
  const { totalBasePoints, materialsBreakdown } = calculateBaseGreenPoints(items);

  const completedPickupsThisMonth = await getMonthlyPickupCount(userId, tx);
  const isFirstPickupThisMonth = completedPickupsThisMonth === 0;
  // If completedPickupsThisMonth is 4, then this current pickup will be the 5th
  const isFifthPickupThisMonth = completedPickupsThisMonth === 4;

  const { totalBonusPoints, bonusesBreakdown } = calculateBonusPoints(
    items,
    isFirstPickupThisMonth,
    isFifthPickupThisMonth
  );

  // Apply Membership Bonus
  const db = tx ?? prisma;
  const user = await db.user.findUnique({ where: { id: userId }, select: { greenPointsBalance: true, totalGreenPoints: true, accountType: true } });
  const lifetimePoints = Math.max(user?.totalGreenPoints ?? 0, user?.greenPointsBalance ?? 0);
  const currentLevel = calculateMembershipLevel(lifetimePoints, user?.accountType ?? null);
  const membershipBonusPercentage = getMembershipBonusPercentage(currentLevel);
  
  const subtotal = totalBasePoints + totalBonusPoints;
  const membershipBonusPoints = Math.round(subtotal * (membershipBonusPercentage / 100));
  
  if (membershipBonusPoints > 0) {
    bonusesBreakdown.push({
      name: `${currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1).toLowerCase()} Member Bonus (${membershipBonusPercentage}%)`,
      points: membershipBonusPoints,
    });
  }

  const finalTotalBonusPoints = totalBonusPoints + membershipBonusPoints;
  const totalPoints = totalBasePoints + finalTotalBonusPoints;

  const rewardReason = {
    materials: materialsBreakdown,
    bonuses: bonusesBreakdown,
    basePoints: totalBasePoints,
    bonusPoints: finalTotalBonusPoints,
    totalPoints: totalPoints,
  };

  return { totalPoints, basePoints: totalBasePoints, bonusPoints: finalTotalBonusPoints, rewardReason };
}
