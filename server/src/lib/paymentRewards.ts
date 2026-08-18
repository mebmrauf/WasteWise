import { prisma } from "./prisma";
import { calculateGreenPointsForPickup, calculateMembershipLevel } from "./rewards";
import { GreenPointsTransactionType, Prisma, TransactionCategory } from "@prisma/client";
import { createNotification } from "./notifications";

export async function processGreenPointsForPickup(pickupRequestId: string) {
  const pickup = await prisma.pickupRequest.findUniqueOrThrow({
    where: { id: pickupRequestId },
  });

  const items = await prisma.pickupRequestItem.findMany({
    where: { pickupRequestId },
  });

  const validItems = items
    .filter(item => item.exactWeightKg !== null)
    .map(item => ({ category: item.category, exactWeightKg: item.exactWeightKg! }));

  const result = await prisma.$transaction(async (tx) => {
    const { totalPoints, basePoints, bonusPoints, rewardReason } = await calculateGreenPointsForPickup(
      pickup.requesterId,
      validItems,
      tx as any
    );

    const userToUpdate = await tx.user.findUniqueOrThrow({
      where: { id: pickup.requesterId },
      select: { greenPointsBalance: true, referredById: true, referralRewardClaimed: true, totalGreenPoints: true, accountType: true },
    });

    const lifetimePointsBefore = Math.max(userToUpdate.totalGreenPoints ?? 0, userToUpdate.greenPointsBalance ?? 0);
    const oldMembership = calculateMembershipLevel(lifetimePointsBefore, userToUpdate.accountType);

    await tx.user.update({
      where: { id: pickup.requesterId },
      data: {
        greenPointsBalance: { increment: totalPoints },
        totalGreenPoints: { increment: totalPoints },
      },
    });

    const lifetimePointsAfter = lifetimePointsBefore + totalPoints;
    const newMembership = calculateMembershipLevel(lifetimePointsAfter, userToUpdate.accountType);

    if (newMembership !== oldMembership) {
      await tx.greenPointsTransaction.create({
        data: {
          userId: pickup.requesterId,
          pickupRequestId,
          points: 0,
          type: GreenPointsTransactionType.EARNED,
          category: "LOYALTY",
          description: `${newMembership.charAt(0).toUpperCase() + newMembership.slice(1).toLowerCase()} Membership Unlocked`,
        }
      });
    }

    await tx.greenPointsTransaction.create({
      data: {
        userId: pickup.requesterId,
        pickupRequestId,
        points: basePoints,
        basePoints,
        rewardReason: userToUpdate.accountType === "BUSINESS"
          ? (rewardReason as unknown as Prisma.InputJsonValue)
          : { materials: rewardReason.materials, bonuses: [] },
        type: GreenPointsTransactionType.EARNED,
        category: "PICKUP",
        description: "Pickup completed",
      },
    });

    for (const bonus of rewardReason.bonuses) {
      let category: TransactionCategory = "BONUS";
      if (userToUpdate.accountType === "BUSINESS" && bonus.name.includes("Member Bonus")) {
        category = "LOYALTY";
      }

      await tx.greenPointsTransaction.create({
        data: {
          userId: pickup.requesterId,
          pickupRequestId,
          points: bonus.points,
          bonusPoints: bonus.points,
          type: GreenPointsTransactionType.EARNED,
          category,
          description: bonus.name,
        }
      });
    }

    let referralRewardsProcessed = false;
    let referrerId: string | null = null;
    const newMilestones: number[] = [];

    const totalVerifiedWeight = validItems.reduce((sum, i) => sum + i.exactWeightKg, 0);
    if (userToUpdate.referredById && !userToUpdate.referralRewardClaimed && totalVerifiedWeight >= 5) {
      referralRewardsProcessed = true;
      referrerId = userToUpdate.referredById;

      await tx.user.update({
        where: { id: pickup.requesterId },
        data: {
          greenPointsBalance: { increment: 50 },
          totalGreenPoints: { increment: 50 },
          referralPointsEarned: { increment: 50 },
          referralRewardClaimed: true,
        },
      });

      await tx.greenPointsTransaction.create({
        data: {
          userId: pickup.requesterId,
          pickupRequestId,
          points: 50,
          type: GreenPointsTransactionType.EARNED,
          category: "REFERRAL",
          description: "Referral signup reward",
        },
      });

      const referrer = await tx.user.update({
        where: { id: userToUpdate.referredById },
        data: {
          greenPointsBalance: { increment: 100 },
          totalGreenPoints: { increment: 100 },
          referralPointsEarned: { increment: 100 },
          successfulReferrals: { increment: 1 },
        },
        select: { successfulReferrals: true, milestonesClaimed: true, id: true }
      });

      await tx.greenPointsTransaction.create({
        data: {
          userId: referrer.id,
          pickupRequestId,
          points: 100,
          type: GreenPointsTransactionType.EARNED,
          category: "REFERRAL",
          description: "Friend referral reward",
        },
      });

      const milestones = [
        { count: 10, points: 100 },
        { count: 20, points: 300 },
        { count: 30, physical: "Eco-friendly Tote Bag" },
        { count: 50, physical: "Tree Sapling + Community Recognition Badge" },
      ];

      for (const m of milestones) {
        if (referrer.successfulReferrals >= m.count && !referrer.milestonesClaimed.includes(m.count)) {
          newMilestones.push(m.count);
          await tx.user.update({
            where: { id: referrer.id },
            data: {
              milestonesClaimed: { push: m.count },
              ...(m.points ? {
                greenPointsBalance: { increment: m.points },
                totalGreenPoints: { increment: m.points },
              } : {})
            }
          });

          if (m.points) {
            await tx.greenPointsTransaction.create({
              data: {
                userId: referrer.id,
                points: m.points,
                type: GreenPointsTransactionType.EARNED,
                category: "REFERRAL",
                description: `Referral milestone reward (${m.count} friends)`,
              }
            });
          }
        }
      }
    }

    const hasLoyaltyBonus = rewardReason.bonuses.some((b) => b.name.includes("Member Bonus"));

    return {
      referralRewardsProcessed,
      referrerId,
      newMilestones,
      totalPoints,
      membershipChanged: newMembership !== oldMembership,
      newMembership,
      hasLoyaltyBonus,
      loyaltyBonusPoints: hasLoyaltyBonus ? rewardReason.bonuses.find((b) => b.name.includes("Member Bonus"))?.points : 0,
    };
  });

  if (result.totalPoints > 0) {
    void createNotification({
      userId: pickup.requesterId,
      type: "GENERIC",
      title: "Green Points Earned",
      message: `You earned ${result.totalPoints} Green Points for this pickup!`,
      relatedPickupRequestId: pickupRequestId,
      emailPreference: "rewardsEmailNotificationsEnabled",
    });
  }

  if (result.hasLoyaltyBonus && result.loyaltyBonusPoints) {
    void createNotification({
      userId: pickup.requesterId,
      type: "GENERIC",
      title: "Loyalty Bonus Earned",
      message: `You earned an extra ${result.loyaltyBonusPoints} Green Points as a ${result.newMembership.charAt(0).toUpperCase() + result.newMembership.slice(1).toLowerCase()} member!`,
      relatedPickupRequestId: pickupRequestId,
      emailPreference: "rewardsEmailNotificationsEnabled",
    });
  }

  if (result.membershipChanged) {
    const levelLabel = result.newMembership.charAt(0).toUpperCase() + result.newMembership.slice(1).toLowerCase();
    void createNotification({
      userId: pickup.requesterId,
      type: "GENERIC",
      title: "Membership Tier Upgraded",
      message: `🎉 Congratulations! You've been upgraded to ${levelLabel} membership.`,
      emailPreference: "rewardsEmailNotificationsEnabled",
    });
  }

  if (result.referralRewardsProcessed) {
    void createNotification({
      userId: pickup.requesterId,
      type: "GENERIC",
      title: "Referral Reward",
      message: `🎉 Welcome! You earned 50 Green Points for joining through a referral and completing your first verified pickup.`,
      emailPreference: "rewardsEmailNotificationsEnabled",
    });

    if (result.referrerId) {
      void createNotification({
        userId: result.referrerId,
        type: "GENERIC",
        title: "Referral Reward",
        message: `🎉 Congratulations! Your referred friend completed their first verified pickup. You earned 100 Green Points.`,
        emailPreference: "rewardsEmailNotificationsEnabled",
      });

      for (const m of result.newMilestones) {
        void createNotification({
          userId: result.referrerId,
          type: "GENERIC",
          title: "Referral Milestone Reached",
          message: `🎉 You reached a new referral milestone (${m} friends)!`,
          emailPreference: "rewardsEmailNotificationsEnabled",
        });
      }
    }
  }
}
