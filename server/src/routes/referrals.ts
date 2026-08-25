import { Router } from "express";
import { randomBytes } from "node:crypto";
import { requireAuth } from "../lib/rbac";
import { asyncHandler } from "../lib/asyncHandler";
import { prisma } from "../lib/prisma";
import { sendData } from "../lib/apiResponse";

export const referralsRouter = Router();

referralsRouter.get(
  "/dashboard",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
        successfulReferrals: true,
        referralPointsEarned: true,
        milestonesClaimed: true,
        fullName: true,
        role: true,
        accountType: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "USER" || user.accountType !== "HOUSEHOLD") {
      return sendData(res, 403, { error: "Referral program is only available to Individual household accounts." });
    }

    if (!user.referralCode) {
      const newReferralCode = `${user.fullName.split(' ')[0].replace(/[^A-Za-z]/g, '').substring(0, 4).toUpperCase()}${randomBytes(2).toString('hex').toUpperCase()}`;
      await prisma.user.update({
        where: { id: userId },
        data: { referralCode: newReferralCode }
      });
      user.referralCode = newReferralCode;
    }

    const referredUsers = await prisma.user.findMany({
      where: { referredById: userId },
      select: {
        id: true,
        fullName: true,
        createdAt: true,
        referralRewardClaimed: true,
        pickupRequestsMade: {
          select: {
            status: true,
            createdAt: true,
            items: {
              select: {
                exactWeightKg: true,
              }
            }
          },
          orderBy: { createdAt: 'asc' },
        }
      },
      orderBy: { createdAt: "desc" },
    });

    const history = referredUsers.map((friend) => {
      // Find the first completed verified pickup (if any)
      const firstVerifiedPickup = friend.pickupRequestsMade.find(
        (p) => p.status === "COMPLETED" && p.items.some(i => i.exactWeightKg !== null)
      );

      // Determine pickup status
      let firstPickupStatus = "Pending";
      if (firstVerifiedPickup) {
        firstPickupStatus = "Completed";
      } else if (friend.pickupRequestsMade.length > 0) {
        // They have made pickups, but maybe none are completed and verified >= 5kg
        const activePickups = friend.pickupRequestsMade.filter(p => p.status !== "CANCELLED");
        if (activePickups.some(p => p.status !== "COMPLETED")) {
          firstPickupStatus = "In Progress";
        } else {
          firstPickupStatus = "No Qualified Pickup";
        }
      }

      return {
        id: friend.id,
        friendName: friend.fullName,
        registrationDate: friend.createdAt,
        firstPickupStatus,
        rewardStatus: friend.referralRewardClaimed ? "Completed" : (firstPickupStatus === "Completed" ? "Pending Approval" : "Waiting"),
        greenPointsEarned: friend.referralRewardClaimed ? "+100" : "0",
      };
    });

    sendData(res, 200, {
      referralCode: user.referralCode,
      friendsInvited: referredUsers.length,
      successfulReferrals: user.successfulReferrals,
      referralPointsEarned: user.referralPointsEarned,
      milestonesClaimed: user.milestonesClaimed,
      history,
    });
  }),
);
