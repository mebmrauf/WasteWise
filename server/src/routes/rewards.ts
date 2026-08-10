import { Router } from "express";
import { GreenPointsTransactionType, MobileRechargeStatus } from "@prisma/client";
import type { GreenPointsTransaction, MobileRechargeTransaction } from "@prisma/client";
import { requireAuth, requireRole } from "../lib/rbac";
import { requireCsrf } from "../lib/csrf";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData, sendError } from "../lib/apiResponse";
import { prisma } from "../lib/prisma";
import { calculatePointsForRecharge, isPhoneNumberValidForOperator, calculateMembershipLevel, getMembershipBadge } from "../lib/rewards";
import { rechargeRequestSchema, claimPlatinumGiftSchema } from "./rewards.schemas";

export const rewardsRouter = Router();

const REWARDS_HISTORY_LIMIT = 50;

function toGreenPointsTransactionSummary(txn: GreenPointsTransaction) {
  return {
    id: txn.id,
    pickupRequestId: txn.pickupRequestId,
    points: txn.points,
    type: txn.type,
    category: txn.category,
    description: txn.description,
    basePoints: txn.basePoints,
    bonusPoints: txn.bonusPoints,
    totalPoints: txn.totalPoints,
    rewardReason: txn.rewardReason,
    createdAt: txn.createdAt,
  };
}

function toMobileRechargeTransactionSummary(txn: MobileRechargeTransaction) {
  return {
    id: txn.id,
    operator: txn.operator,
    simType: txn.simType,
    phoneNumber: txn.phoneNumber,
    amountTaka: txn.amountTaka,
    pointsSpent: txn.pointsSpent,
    status: txn.status,
    createdAt: txn.createdAt,
  };
}

rewardsRouter.get(
  "/balance",
  requireAuth,
  requireRole("USER"),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      select: { 
        greenPointsBalance: true,
        totalGreenPoints: true,
        lastDiscountClaimDate: true,
        nextDiscountEligibleDate: true,
        discountCouponClaimed: true,
        selectedGift: true,
        giftClaimDate: true,
        nextGiftEligibleDate: true,
        giftClaimed: true,
      },
    });

    const lifetimePoints = Math.max(user.totalGreenPoints, user.greenPointsBalance);
    const membershipLevel = calculateMembershipLevel(lifetimePoints);
    const membershipBadge = getMembershipBadge(membershipLevel);

    sendData(res, 200, { 
      greenPointsBalance: user.greenPointsBalance,
      totalGreenPoints: lifetimePoints,
      membershipLevel,
      membershipBadge,
      lastDiscountClaimDate: user.lastDiscountClaimDate,
      nextDiscountEligibleDate: user.nextDiscountEligibleDate,
      discountCouponClaimed: user.discountCouponClaimed,
      selectedGift: user.selectedGift,
      giftClaimDate: user.giftClaimDate,
      nextGiftEligibleDate: user.nextGiftEligibleDate,
      giftClaimed: user.giftClaimed,
    });
  }),
);

rewardsRouter.get(
  "/history",
  requireAuth,
  requireRole("USER"),
  asyncHandler(async (req, res) => {
    const [greenPointsTransactions, mobileRechargeTransactions] = await Promise.all([
      prisma.greenPointsTransaction.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: "desc" },
        take: REWARDS_HISTORY_LIMIT,
      }),
      prisma.mobileRechargeTransaction.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: "desc" },
        take: REWARDS_HISTORY_LIMIT,
      }),
    ]);

    sendData(res, 200, {
      greenPointsTransactions: greenPointsTransactions.map(toGreenPointsTransactionSummary),
      mobileRechargeTransactions: mobileRechargeTransactions.map(
        toMobileRechargeTransactionSummary,
      ),
    });
  }),
);

rewardsRouter.post(
  "/recharge",
  requireAuth,
  requireRole("USER"),
  requireCsrf,
  asyncHandler(async (req, res) => {
    const parsed = rechargeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    const { operator, simType, phoneNumber, amountTaka } = parsed.data;
    const pointsSpent = calculatePointsForRecharge(amountTaka);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      select: { greenPointsBalance: true, totalGreenPoints: true },
    });
    if (pointsSpent > user.greenPointsBalance) {
      sendError(
        res,
        409,
        "INSUFFICIENT_POINTS",
        "You don't have enough Green Points for this recharge.",
      );
      return;
    }

    if (!isPhoneNumberValidForOperator(phoneNumber, operator)) {
      const failedRecharge = await prisma.mobileRechargeTransaction.create({
        data: {
          userId: req.user!.id,
          operator,
          simType,
          phoneNumber,
          amountTaka,
          pointsSpent,
          status: MobileRechargeStatus.FAILED,
        },
      });

      sendData(res, 200, {
        recharge: toMobileRechargeTransactionSummary(failedRecharge),
        greenPointsBalance: user.greenPointsBalance,
      });
      return;
    }

    const lifetimePoints = Math.max(user.totalGreenPoints, user.greenPointsBalance);
    const newMembershipLevel = calculateMembershipLevel(lifetimePoints);
    const newMembershipBadge = getMembershipBadge(newMembershipLevel);

    const result = await prisma.$transaction(async (tx) => {
      const deducted = await tx.user.updateMany({
        where: { id: req.user!.id, greenPointsBalance: { gte: pointsSpent } },
        data: { 
          greenPointsBalance: { decrement: pointsSpent },
        },
      });
      if (deducted.count === 0) {
        return null;
      }

      const greenPointsTransaction = await tx.greenPointsTransaction.create({
        data: {
          userId: req.user!.id,
          points: pointsSpent,
          type: GreenPointsTransactionType.REDEEMED,
          category: "REDEMPTION",
          description: `Mobile recharge — ${phoneNumber}`,
        },
      });
      const recharge = await tx.mobileRechargeTransaction.create({
        data: {
          userId: req.user!.id,
          operator,
          simType,
          phoneNumber,
          amountTaka,
          pointsSpent,
          status: MobileRechargeStatus.SUCCESS,
          greenPointsTransactionId: greenPointsTransaction.id,
        },
      });
      const updatedUser = await tx.user.findUniqueOrThrow({
        where: { id: req.user!.id },
        select: { greenPointsBalance: true },
      });

      return { recharge, greenPointsBalance: updatedUser.greenPointsBalance, membershipLevel: newMembershipLevel, membershipBadge: newMembershipBadge };
    });

    if (!result) {
      sendError(
        res,
        409,
        "INSUFFICIENT_POINTS",
        "You don't have enough Green Points for this recharge.",
      );
      return;
    }

    sendData(res, 200, {
      recharge: toMobileRechargeTransactionSummary(result.recharge),
      greenPointsBalance: result.greenPointsBalance,
      membershipLevel: result.membershipLevel,
      membershipBadge: result.membershipBadge,
    });
  }),
);

rewardsRouter.post(
  "/claim-gift",
  requireAuth,
  requireRole("USER"),
  requireCsrf,
  asyncHandler(async (req, res) => {
    const parsed = claimPlatinumGiftSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    const { gift } = parsed.data;

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      select: { greenPointsBalance: true, totalGreenPoints: true, giftClaimDate: true },
    });

    const lifetimePoints = Math.max(user.totalGreenPoints, user.greenPointsBalance);
    const membershipLevel = calculateMembershipLevel(lifetimePoints);

    if (membershipLevel !== "PLATINUM") {
      sendError(res, 403, "FORBIDDEN", "Only Platinum members can claim exclusive gifts.");
      return;
    }

    // Enforce 6-month rule
    if (user.giftClaimDate) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      if (user.giftClaimDate > sixMonthsAgo) {
        sendError(res, 409, "NOT_ELIGIBLE", "You have already claimed a gift within the last 6 months.");
        return;
      }
    }

    const nextGiftEligibleDate = new Date();
    nextGiftEligibleDate.setMonth(nextGiftEligibleDate.getMonth() + 6);

    const updatedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: req.user!.id },
        data: {
          selectedGift: gift,
          giftClaimDate: new Date(),
          nextGiftEligibleDate,
          giftClaimed: true,
        },
        select: {
          selectedGift: true,
          giftClaimDate: true,
          nextGiftEligibleDate: true,
          giftClaimed: true,
        },
      });

      await tx.greenPointsTransaction.create({
        data: {
          userId: req.user!.id,
          points: 0,
          type: GreenPointsTransactionType.REDEEMED,
          category: "REDEMPTION",
          description: "Exclusive Eco Gift Claimed",
        }
      });

      return updated;
    });

    sendData(res, 200, {
      selectedGift: updatedUser.selectedGift,
      giftClaimDate: updatedUser.giftClaimDate,
      nextGiftEligibleDate: updatedUser.nextGiftEligibleDate,
      giftClaimed: updatedUser.giftClaimed,
    });
  }),
);

rewardsRouter.post(
  "/claim-discount",
  requireAuth,
  requireRole("USER"),
  requireCsrf,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      select: { greenPointsBalance: true, totalGreenPoints: true, lastDiscountClaimDate: true },
    });

    const lifetimePoints = Math.max(user.totalGreenPoints, user.greenPointsBalance);
    const membershipLevel = calculateMembershipLevel(lifetimePoints);

    if (membershipLevel !== "GOLD" && membershipLevel !== "PLATINUM") {
      sendError(res, 403, "FORBIDDEN", "Only Gold and Platinum members can claim Eco Shop discounts.");
      return;
    }

    // Enforce 6-month rule
    if (user.lastDiscountClaimDate) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      if (user.lastDiscountClaimDate > sixMonthsAgo) {
        sendError(res, 409, "NOT_ELIGIBLE", "You have already claimed a discount within the last 6 months.");
        return;
      }
    }

    const nextDiscountEligibleDate = new Date();
    nextDiscountEligibleDate.setMonth(nextDiscountEligibleDate.getMonth() + 6);

    const updatedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: req.user!.id },
        data: {
          lastDiscountClaimDate: new Date(),
          nextDiscountEligibleDate,
          discountCouponClaimed: true,
        },
        select: {
          lastDiscountClaimDate: true,
          nextDiscountEligibleDate: true,
          discountCouponClaimed: true,
        },
      });

      await tx.greenPointsTransaction.create({
        data: {
          userId: req.user!.id,
          points: 0,
          type: GreenPointsTransactionType.REDEEMED,
          category: "REDEMPTION",
          description: "5% Eco Shop Discount Claimed",
        }
      });

      return updated;
    });

    sendData(res, 200, {
      lastDiscountClaimDate: updatedUser.lastDiscountClaimDate,
      nextDiscountEligibleDate: updatedUser.nextDiscountEligibleDate,
      discountCouponClaimed: updatedUser.discountCouponClaimed,
    });
  }),
);
