import { authFetch } from "./auth";

export interface ReferralHistoryItem {
  id: string;
  friendName: string;
  registrationDate: string;
  firstPickupStatus: string;
  rewardStatus: string;
  greenPointsEarned: string;
}

export interface ReferralDashboardData {
  referralCode: string;
  friendsInvited: number;
  successfulReferrals: number;
  referralPointsEarned: number;
  milestonesClaimed: number[];
  history: ReferralHistoryItem[];
}

export function getReferralDashboard(): Promise<ReferralDashboardData> {
  return authFetch<ReferralDashboardData>("/referrals/dashboard", {
    method: "GET",
  });
}
