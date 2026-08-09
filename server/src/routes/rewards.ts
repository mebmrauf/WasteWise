import { Router } from "express";
import { GreenPointsTransactionType, MobileRechargeStatus } from "@prisma/client";
import type { GreenPointsTransaction, MobileRechargeTransaction } from "@prisma/client";
import { requireAuth, requireRole } from "../lib/rbac";
import { requireCsrf } from "../lib/csrf";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData, sendError } from "../lib/apiResponse";
import { prisma } from "../lib/prisma";
import { calculatePointsForRecharge, isPhoneNumberValidForOperator } from "../lib/rewards";
import { rechargeRequestSchema } from "./rewards.schemas";

export const rewardsRouter = Router();

const REWARDS_HISTORY_LIMIT = 50;

function toGreenPointsTransactionSummary(txn: GreenPointsTransaction) {
  return {
    id: txn.id,
    pickupRequestId: txn.pickupRequestId,
    points: txn.points,
    type: txn.type,
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
      select: { greenPointsBalance: true },
    });

    sendData(res, 200, { greenPointsBalance: user.greenPointsBalance });
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
      select: { greenPointsBalance: true },
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

    const result = await prisma.$transaction(async (tx) => {
      const deducted = await tx.user.updateMany({
        where: { id: req.user!.id, greenPointsBalance: { gte: pointsSpent } },
        data: { greenPointsBalance: { decrement: pointsSpent } },
      });
      if (deducted.count === 0) {
        return null;
      }

      const greenPointsTransaction = await tx.greenPointsTransaction.create({
        data: {
          userId: req.user!.id,
          points: pointsSpent,
          type: GreenPointsTransactionType.REDEEMED,
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

      return { recharge, greenPointsBalance: updatedUser.greenPointsBalance };
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
    });
  }),
);
