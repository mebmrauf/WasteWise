"use client";

import * as React from "react";
import { ClipboardList, Gift, Sparkles, ArrowDownRight, ArrowUpRight, Smartphone, CheckCircle2, Recycle, Users, Award, Target, Tag, ChevronDown, ChevronUp, History, Diamond } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useAuth } from "@/lib/auth/AuthContext";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Icon } from "@/components/Icon";
import { MOBILE_OPERATOR_LABELS } from "@/components/OperatorSelector";
import { PageContainer } from "@/components/PageContainer";
import { StatusPill } from "@/components/StatusPill";
import { AuthApiError } from "@/lib/api/auth";
import {
  getRewardsBalance,
  getRewardsHistory,
  type GreenPointsTransaction,
  type MobileRechargeTransaction,
  type SubmitRechargeResult,
  type RewardReason,
} from "@/lib/api/rewards";
import { RECHARGE_STATUS_LABEL, RECHARGE_STATUS_TONE } from "@/lib/rechargeStatus";
import { formatBdt, cn } from "@/lib/utils";
import { RedeemRechargeWizard } from "./RedeemRechargeWizard";
import { BusinessMembershipNotification } from "@/components/BusinessMembershipNotification";
import { PlatinumGiftModal } from "@/components/PlatinumGiftModal";
import { claimDiscount } from "@/lib/api/rewards";

type LoadState = "loading" | "ready" | "error";
type Mode = "overview" | "redeem";

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · ${date.toLocaleTimeString(
    undefined,
    { hour: "2-digit", minute: "2-digit" },
  )}`;
}

type TransactionCategory = "ALL" | "PICKUP" | "REFERRAL" | "LOYALTY" | "MILESTONE" | "REDEMPTION" | "GIFT" | "DISCOUNT" | "BONUS" | "OTHER";

interface UnifiedTransaction {
  id: string;
  originalId: string;
  createdAt: string;
  points: number;
  category: TransactionCategory;
  title: string;
  subtitle: string;
  rewardReason?: RewardReason | null;
  rechargeStatus?: MobileRechargeTransaction["status"];
}

const GIFT_NAMES: Record<string, string> = {
  TREE_SAPLING: "Tree Sapling",
  ECO_TOTE_BAG: "Eco-friendly Tote Bag",
  REUSABLE_WATER_BOTTLE: "Reusable Water Bottle",
};

export function RewardsView() {
  const [loadState, setLoadState] = React.useState<LoadState>("loading");
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<Mode>("overview");

  const [balance, setBalance] = React.useState<number>(0);
  const [totalPoints, setTotalPoints] = React.useState<number>(0);
  const [membershipLevel, setMembershipLevel] = React.useState<"BRONZE" | "SILVER" | "GOLD" | "PLATINUM">("BRONZE");
  const [membershipBadge, setMembershipBadge] = React.useState<string>("Bronze Badge");
  
  const [lastDiscountClaimDate, setLastDiscountClaimDate] = React.useState<string | null>(null);
  const [nextDiscountEligibleDate, setNextDiscountEligibleDate] = React.useState<string | null>(null);
  const [discountCouponClaimed, setDiscountCouponClaimed] = React.useState(false);
  const [isClaimingDiscount, setIsClaimingDiscount] = React.useState(false);

  const [selectedGift, setSelectedGift] = React.useState<string | null>(null);
  const [giftClaimDate, setGiftClaimDate] = React.useState<string | null>(null);
  const [nextGiftEligibleDate, setNextGiftEligibleDate] = React.useState<string | null>(null);
  const [giftClaimed, setGiftClaimed] = React.useState(false);
  
  const [isGiftModalOpen, setIsGiftModalOpen] = React.useState(false);

  const [accountType, setAccountType] = React.useState<"HOUSEHOLD" | "BUSINESS" | null>(null);
  const [environmentalImpact, setEnvironmentalImpact] = React.useState<any>(null);

  const [greenPointsTransactions, setGreenPointsTransactions] = React.useState<GreenPointsTransaction[]>([]);
  const [mobileRechargeTransactions, setMobileRechargeTransactions] = React.useState<MobileRechargeTransaction[]>([]);

  const [filterTab, setFilterTab] = React.useState<TransactionCategory>("ALL");
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  const fetchAll = React.useCallback(() => {
    setLoadState("loading");
    setLoadError(null);
    return Promise.all([getRewardsBalance(), getRewardsHistory()])
      .then(([balanceResult, historyResult]) => {
        setBalance(balanceResult.greenPointsBalance);
        setTotalPoints(balanceResult.totalGreenPoints);
        setMembershipLevel(balanceResult.membershipLevel);
        setMembershipBadge(balanceResult.membershipBadge);
        
        setAccountType(balanceResult.accountType);
        setEnvironmentalImpact(balanceResult.environmentalImpact);

        setLastDiscountClaimDate(balanceResult.lastDiscountClaimDate);
        setNextDiscountEligibleDate(balanceResult.nextDiscountEligibleDate);
        setDiscountCouponClaimed(balanceResult.discountCouponClaimed);
        
        setSelectedGift(balanceResult.selectedGift);
        setGiftClaimDate(balanceResult.giftClaimDate);
        setNextGiftEligibleDate(balanceResult.nextGiftEligibleDate);
        setGiftClaimed(balanceResult.giftClaimed);

        setGreenPointsTransactions(historyResult.greenPointsTransactions);
        setMobileRechargeTransactions(historyResult.mobileRechargeTransactions);
        setLoadState("ready");
      })
      .catch((err: unknown) => {
        setLoadError(
          err instanceof AuthApiError
            ? "Couldn't load your Green Rewards. Try refreshing the page."
            : "Something went wrong loading your Green Rewards. Try refreshing the page.",
        );
        setLoadState("error");
      });
  }, []);

  React.useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  function handleWizardComplete(result: SubmitRechargeResult) {
    setBalance(result.greenPointsBalance);
    setMembershipLevel(result.membershipLevel);
    setMembershipBadge(result.membershipBadge);
    
    getRewardsHistory()
      .then((historyResult) => {
        setGreenPointsTransactions(historyResult.greenPointsTransactions);
        setMobileRechargeTransactions(historyResult.mobileRechargeTransactions);
      })
      .catch(() => {});
  }

  const isBusiness = true;

  // Calculate membership progress
  let nextLevelPoints = isBusiness ? 1501 : 501;
  let nextLevelName = "Silver";
  let progressPercentage = 0;
  if (membershipLevel === "BRONZE") {
    nextLevelPoints = isBusiness ? 1501 : 501;
    nextLevelName = "Silver";
    progressPercentage = (totalPoints / nextLevelPoints) * 100;
  } else if (membershipLevel === "SILVER") {
    nextLevelPoints = isBusiness ? 3001 : 1501;
    nextLevelName = "Gold";
    progressPercentage = (totalPoints / nextLevelPoints) * 100;
  } else if (membershipLevel === "GOLD") {
    nextLevelPoints = isBusiness ? 4500 : 3000;
    nextLevelName = "Platinum";
    progressPercentage = (totalPoints / nextLevelPoints) * 100;
  } else {
    progressPercentage = 100;
  }
  progressPercentage = Math.min(Math.max(progressPercentage, 0), 100);

  // Benefits
  const benefits = [];
  if (membershipLevel === "BRONZE") {
    benefits.push("Bronze Badge");
  } else if (membershipLevel === "SILVER") {
    benefits.push("5% Extra Green Points", "Silver Badge");
  } else if (membershipLevel === "GOLD") {
    benefits.push("10% Extra Green Points", "5% discount in Eco Shop", "Gold Badge");
  } else if (membershipLevel === "PLATINUM") {
    benefits.push("15% Extra Green Points", "Exclusive Eco Gifts", "Platinum Badge");
  }

  const isEligibleForDiscount =
    (membershipLevel === "GOLD" || membershipLevel === "PLATINUM") &&
    (!nextDiscountEligibleDate || new Date() >= new Date(nextDiscountEligibleDate));

  const isEligibleForGift =
    membershipLevel === "PLATINUM" &&
    (!nextGiftEligibleDate || new Date() >= new Date(nextGiftEligibleDate));

  async function handleClaimDiscount() {
    setIsClaimingDiscount(true);
    try {
      const result = await claimDiscount();
      setLastDiscountClaimDate(result.lastDiscountClaimDate);
      setNextDiscountEligibleDate(result.nextDiscountEligibleDate);
      setDiscountCouponClaimed(result.discountCouponClaimed);
    } catch (err) {
      alert("Failed to claim discount. Please try again.");
    } finally {
      setIsClaimingDiscount(false);
    }
  }

  const unifiedTransactions = React.useMemo(() => {
    const list: UnifiedTransaction[] = [];
    
    greenPointsTransactions.forEach((tx) => {
      let category = tx.category as TransactionCategory;
      if (!category || category === "OTHER") {
        const lowerDesc = tx.description.toLowerCase();
        if (lowerDesc.includes("pickup")) category = "PICKUP";
        else if (lowerDesc.includes("referral")) category = "REFERRAL";
        else if (lowerDesc.includes("loyalty")) category = "LOYALTY";
        else if (lowerDesc.includes("milestone")) category = "MILESTONE";
        else if (lowerDesc.includes("gift")) category = "GIFT";
        else if (lowerDesc.includes("discount")) category = "DISCOUNT";
        else if (lowerDesc.includes("bonus")) category = "BONUS";
        else if (tx.type === "EARNED") category = "BONUS";
        else category = "OTHER";
      }
      
      list.push({
        id: `gp-${tx.id}`,
        originalId: tx.id,
        createdAt: tx.createdAt,
        points: tx.type === "EARNED" ? tx.points : -tx.points,
        category,
        title: tx.description,
        subtitle: formatDateTime(tx.createdAt),
        rewardReason: tx.rewardReason,
      });
    });

    mobileRechargeTransactions.forEach((tx) => {
      list.push({
        id: `mr-${tx.id}`,
        originalId: tx.id,
        createdAt: tx.createdAt,
        points: -tx.pointsSpent,
        category: "REDEMPTION",
        title: `${MOBILE_OPERATOR_LABELS[tx.operator]} Recharge`,
        subtitle: `${tx.phoneNumber} · ${formatDateTime(tx.createdAt)}`,
        rechargeStatus: tx.status,
      });
    });

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [greenPointsTransactions, mobileRechargeTransactions]);

  const getCategoryConfig = (category: TransactionCategory) => {
    switch (category) {
      case "PICKUP": return { icon: Recycle, color: "text-emerald-600", bg: "bg-emerald-100" };
      case "REFERRAL": return { icon: Users, color: "text-blue-600", bg: "bg-blue-100" };
      case "LOYALTY": return { icon: Award, color: "text-purple-600", bg: "bg-purple-100" };
      case "MILESTONE": return { icon: Target, color: "text-orange-600", bg: "bg-orange-100" };
      case "REDEMPTION": return { icon: Smartphone, color: "text-rose-600", bg: "bg-rose-100" };
      case "GIFT": return { icon: Gift, color: "text-pink-600", bg: "bg-pink-100" };
      case "DISCOUNT": return { icon: Tag, color: "text-yellow-600", bg: "bg-yellow-100" };
      case "BONUS": return { icon: Sparkles, color: "text-indigo-600", bg: "bg-indigo-100" };
      default: return { icon: History, color: "text-neutral-600", bg: "bg-neutral-100" };
    }
  };

  const groupedTransactions = React.useMemo(() => {
    const filtered = unifiedTransactions.filter(tx => filterTab === "ALL" || tx.category === filterTab);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const groups: { label: string; items: UnifiedTransaction[] }[] = [
      { label: "Today", items: [] },
      { label: "Yesterday", items: [] },
      { label: "Earlier", items: [] },
    ];
    
    filtered.forEach(tx => {
      const txDate = new Date(tx.createdAt);
      txDate.setHours(0, 0, 0, 0);
      
      if (txDate.getTime() === today.getTime()) {
        groups[0].items.push(tx);
      } else if (txDate.getTime() === yesterday.getTime()) {
        groups[1].items.push(tx);
      } else {
        groups[2].items.push(tx);
      }
    });
    
    return groups.filter(g => g.items.length > 0);
  }, [unifiedTransactions, filterTab]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <PageContainer className="py-8 lg:py-12">
      <div className="mb-6">
        <BusinessMembershipNotification 
          level={membershipLevel} 
          goldEligible={membershipLevel === "GOLD" && isEligibleForDiscount}
          goldNextDate={membershipLevel === "GOLD" && !isEligibleForDiscount ? nextDiscountEligibleDate : null}
          platinumEligible={membershipLevel === "PLATINUM" && isEligibleForGift}
          platinumNextDate={membershipLevel === "PLATINUM" && !isEligibleForGift ? nextGiftEligibleDate : null}
          
        />
      </div>

      <h1 className="text-h1 text-neutral-900">Green Rewards</h1>
      <p className="mt-2 text-body-lg text-neutral-500">
        Earn Green Points, climb loyalty levels, and redeem rewards.
      </p>

      {loadState === "loading" && (
        <Card className="mt-8 text-center">
          <p className="text-body-sm text-neutral-500">Loading your Green Rewards…</p>
        </Card>
      )}

      {loadState === "error" && <ErrorBanner className="mt-8">{loadError}</ErrorBanner>}

      {loadState === "ready" && (
        <div className="mt-8 flex flex-col gap-8">
          
          {/* Membership Card */}
          <Card className="overflow-hidden animate-slide-up">
            <div className="p-6 md:p-8 bg-gradient-to-br from-neutral-50 to-neutral-100 border-b border-neutral-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="text-h3 text-neutral-900 mb-1">Membership Status</h2>
                  <div className="flex items-center gap-3">
                    {membershipLevel === "BRONZE" && <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 text-orange-600"><Award className="w-5 h-5" /></div>}
                    {membershipLevel === "SILVER" && <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-200 text-slate-700"><Award className="w-5 h-5" /></div>}
                    {membershipLevel === "GOLD" && <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-200 text-yellow-700"><Award className="w-5 h-5" /></div>}
                    {membershipLevel === "PLATINUM" && <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-200 text-purple-700"><Diamond className="w-5 h-5" /></div>}
                    <span className="text-lg font-semibold text-neutral-900">{membershipLevel.charAt(0) + membershipLevel.slice(1).toLowerCase()} Member</span>
                  </div>
                  <p className="mt-4 text-body-sm text-neutral-500">Total Lifetime Green Points</p>
                  <p className="text-3xl font-data font-bold text-neutral-900">{totalPoints.toLocaleString()}</p>
                </div>

                <div className="w-full md:w-1/2 bg-white p-5 rounded-2xl shadow-sm border border-neutral-100">
                  <h3 className="text-sm font-semibold text-neutral-900 mb-3 uppercase tracking-wider">Benefits</h3>
                  <ul className="flex flex-col gap-2">
                    {benefits.map((b, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-neutral-700">
                        <CheckCircle2 className="w-4 h-4 text-success-500" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="mt-8">
                {membershipLevel !== "PLATINUM" ? (
                  <>
                    <div className="flex justify-between items-end mb-2">
                      <p className="text-sm font-medium text-neutral-700">Progress to {nextLevelName}</p>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-3 overflow-hidden">
                      <div className="bg-primary-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${progressPercentage}%` }} />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-center p-4 bg-primary-50 text-primary-900 rounded-xl font-medium border border-primary-100">
                    Maximum Membership Achieved <Sparkles className="w-5 h-5 text-primary-600" />
                  </div>
                )}
              </div>
            </div>
            
            {/* Environmental Impact (BUSINESS ONLY) */}
            {isBusiness && environmentalImpact && (
              <div className="p-6 md:p-8 bg-emerald-50 border-t border-emerald-100">
                <h3 className="text-lg font-semibold text-emerald-900 mb-4 flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700"><Sparkles className="w-4 h-4" /></div> Environmental Impact
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100">
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Total Recycled</p>
                    <p className="text-2xl font-bold text-neutral-900">{environmentalImpact.totalWasteRecycledKg} kg</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100">
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">CO₂ Reduced</p>
                    <p className="text-2xl font-bold text-neutral-900">{environmentalImpact.totalCo2ReducedKg} kg</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100">
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Trees Saved</p>
                    <p className="text-2xl font-bold text-neutral-900">{environmentalImpact.totalTreesSaved}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Sustainability Certificate (BUSINESS GOLD+) */}
            {isBusiness && (membershipLevel === "GOLD" || membershipLevel === "PLATINUM") && (
              <div className="p-6 md:p-8 bg-white border-t border-neutral-100">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700"><Award className="w-4 h-4" /></div> Sustainability Certificate
                    </h3>
                    <p className="text-neutral-500 text-sm mt-1 max-w-md">
                      This certificate recognizes your organization's commitment to sustainable recycling and environmental responsibility through WasteWise.
                    </p>
                  </div>
                  <div>
                    <Button onClick={() => alert("Downloading certificate...")} className="whitespace-nowrap bg-amber-600 hover:bg-amber-700 text-white border-none">
                      Download Certificate
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Tree Plantation (BUSINESS PLATINUM) */}
            {isBusiness && membershipLevel === "PLATINUM" && (
              <div className="p-6 md:p-8 bg-white border-t border-neutral-100">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700"><CheckCircle2 className="w-4 h-4" /></div> Tree Plantation Reward
                    </h3>
                    <p className="text-neutral-500 text-sm mt-1 max-w-md">
                      As a Platinum Business member, you are eligible to claim a Tree Plantation in your organization's name every 6 months.
                    </p>
                    
                    {giftClaimDate && (
                      <div className="mt-4 p-4 rounded-xl border border-neutral-100 bg-neutral-50 inline-block">
                        <p className="text-sm font-semibold text-neutral-900 mb-2">Claim Status</p>
                        <p className="text-sm text-neutral-700 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success-500" /> Tree Plantation Request
                        </p>
                        <div className="mt-2 text-xs text-neutral-500 grid grid-cols-2 gap-x-4 gap-y-1">
                          <span>Claimed on:</span>
                          <span className="font-medium text-neutral-700">{new Date(giftClaimDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                          {nextGiftEligibleDate && (
                            <>
                              <span>Next eligible claim:</span>
                              <span className="font-medium text-neutral-700">{new Date(nextGiftEligibleDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <Button 
                      onClick={() => setIsGiftModalOpen(true)} 
                      disabled={!isEligibleForGift}
                      className="whitespace-nowrap"
                    >
                      {isEligibleForGift ? "Claim Tree Plantation" : "Claimed"}
                    </Button>
                    {!isEligibleForGift && nextGiftEligibleDate && (
                      <p className="text-xs text-neutral-500 text-center mt-2">
                        Available again on {new Date(nextGiftEligibleDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Gold Discount Section (HOUSEHOLD ONLY) */}
            {!isBusiness && (membershipLevel === "GOLD" || membershipLevel === "PLATINUM") && (
              <div className="p-6 md:p-8 bg-white border-t border-neutral-100">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-700"><Tag className="w-4 h-4" /></div> Eco Shop Discount
                    </h3>
                    <p className="text-neutral-500 text-sm mt-1 max-w-md">
                      As a {membershipLevel === "PLATINUM" ? "Platinum" : "Gold"} member, you are eligible to claim a 5% OFF coupon for the Eco Shop every 6 months.
                    </p>
                    
                    {lastDiscountClaimDate && (
                      <div className="mt-4 p-4 rounded-xl border border-neutral-100 bg-neutral-50 inline-block">
                        <p className="text-sm font-semibold text-neutral-900 mb-2">Coupon Status</p>
                        <p className="text-sm text-neutral-700 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success-500" /> 5% OFF Coupon
                        </p>
                        <div className="mt-2 text-xs text-neutral-500 grid grid-cols-2 gap-x-4 gap-y-1">
                          <span>Claimed on:</span>
                          <span className="font-medium text-neutral-700">{new Date(lastDiscountClaimDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                          {nextDiscountEligibleDate && (
                            <>
                              <span>Next eligible claim:</span>
                              <span className="font-medium text-neutral-700">{new Date(nextDiscountEligibleDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <Button 
                      onClick={handleClaimDiscount} 
                      disabled={!isEligibleForDiscount || isClaimingDiscount}
                      className="whitespace-nowrap"
                    >
                      {isClaimingDiscount ? "Claiming..." : (isEligibleForDiscount ? "Claim Discount" : "Claimed")}
                    </Button>
                    {!isEligibleForDiscount && nextDiscountEligibleDate && (
                      <p className="text-xs text-neutral-500 text-center mt-2">
                        Available again on {new Date(nextDiscountEligibleDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Platinum Gift Section (HOUSEHOLD ONLY) */}
            {!isBusiness && membershipLevel === "PLATINUM" && (
              <div className="p-6 md:p-8 bg-white border-t border-neutral-100">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-pink-100 text-pink-700"><Gift className="w-4 h-4" /></div> Exclusive Eco Gift
                    </h3>
                    <p className="text-neutral-500 text-sm mt-1 max-w-md">
                      As a Platinum member, you are eligible to claim one exclusive eco-friendly gift every 6 months.
                    </p>
                    
                    {selectedGift && (
                      <div className="mt-4 p-4 rounded-xl border border-neutral-100 bg-neutral-50 inline-block">
                        <p className="text-sm font-semibold text-neutral-900 mb-2">Gift Status</p>
                        <p className="text-sm text-neutral-700 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success-500" /> {GIFT_NAMES[selectedGift] || selectedGift}
                        </p>
                        <div className="mt-2 text-xs text-neutral-500 grid grid-cols-2 gap-x-4 gap-y-1">
                          <span>Claimed on:</span>
                          <span className="font-medium text-neutral-700">{new Date(giftClaimDate!).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                          {nextGiftEligibleDate && (
                            <>
                              <span>Next eligible claim:</span>
                              <span className="font-medium text-neutral-700">{new Date(nextGiftEligibleDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <Button 
                      onClick={() => setIsGiftModalOpen(true)} 
                      disabled={!isEligibleForGift}
                      className="whitespace-nowrap"
                    >
                      {isEligibleForGift ? "Claim Gift" : "Claimed"}
                    </Button>
                    {!isEligibleForGift && nextGiftEligibleDate && (
                      <p className="text-xs text-neutral-500 text-center mt-2">
                        Available again on {new Date(nextGiftEligibleDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>


          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-900 p-8 shadow-xl text-center animate-slide-up">
            <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
            <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
            
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-md shadow-inner">
                <Icon icon={Gift} size="xl" className="text-white" aria-hidden />
              </div>
              <div>
                <p className="text-body-sm text-primary-100 uppercase tracking-widest font-semibold mb-2">Available Balance</p>
                <div className="flex items-baseline justify-center gap-2">
                  <p className="font-data text-display text-white">{balance.toLocaleString()}</p>
                  <p className="font-data text-data-lg text-primary-200">pts</p>
                </div>
              </div>
              {!isBusiness && (
                mode === "overview" ? (
                  <Button onClick={() => setMode("redeem")} variant="secondary" className="mt-4 px-8 py-6 rounded-full shadow-lg hover:scale-105 transition-transform bg-white text-primary-800 hover:bg-neutral-50 border-0">
                    Redeem Mobile Recharge
                  </Button>
                ) : (
                  <Button onClick={() => setMode("overview")} variant="ghost" className="mt-4 text-white hover:bg-white/10 hover:text-white rounded-full">
                    Cancel Redemption
                  </Button>
                )
              )}
            </div>
          </div>

          {!isBusiness && mode === "redeem" && (
            <div className="animate-slide-up">
              <RedeemRechargeWizard
                currentBalance={balance}
                onComplete={handleWizardComplete}
                onExit={() => setMode("overview")}
              />
            </div>
          )}

          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-h3 text-neutral-900">Rewards History</h2>
              <p className="mt-1 text-body-sm text-neutral-500">Track every Green Point earned, redeemed, and rewarded.</p>
            </div>

            {unifiedTransactions.length === 0 ? (
              <Card className="flex flex-col items-center gap-3 py-10 text-center">
                <Icon icon={History} size="lg" className="text-neutral-400" aria-hidden />
                <div>
                  <p className="text-h4 text-neutral-900">No history yet</p>
                  <p className="mt-1 text-body-sm text-neutral-500">
                    Complete a pickup or redeem a reward to see it here.
                  </p>
                </div>
              </Card>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {(["ALL", "PICKUP", "REFERRAL", "LOYALTY", "REDEMPTION", "BONUS"] as const)
                    .filter(tab => !(isBusiness && (tab === "REFERRAL" || tab === "REDEMPTION")))
                    .map(tab => (
                    <button
                      key={tab}
                      onClick={() => setFilterTab(tab)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                        filterTab === tab
                          ? "bg-primary-600 text-white"
                          : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
                      )}
                    >
                      {tab.charAt(0) + tab.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-8">
                  {groupedTransactions.map(group => (
                    <div key={group.label} className="flex flex-col gap-3">
                      <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">{group.label}</h3>
                      <div className="flex flex-col gap-3">
                        {group.items.map(tx => {
                          const config = getCategoryConfig(tx.category);
                          const isExpanded = expandedIds.has(tx.id);
                          const isPickup = tx.category === "PICKUP" && tx.rewardReason;

                          return (
                            <Card 
                              key={tx.id} 
                              className={cn(
                                "flex flex-col p-4 md:p-5 rounded-2xl transition-all border-neutral-100 bg-white/60 backdrop-blur-sm",
                                isPickup && "cursor-pointer hover:shadow-md"
                              )}
                              onClick={() => isPickup && toggleExpand(tx.id)}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="flex items-center gap-4">
                                  <div className={cn("flex items-center justify-center h-10 w-10 shrink-0 rounded-full", config.bg, config.color)}>
                                    <Icon icon={config.icon} size="sm" />
                                  </div>
                                  <div>
                                    <p className="text-body font-medium text-neutral-900">{tx.title}</p>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                      <p className="text-caption text-neutral-500">{tx.subtitle}</p>
                                      {tx.rechargeStatus && (
                                        <>
                                          <span className="text-neutral-300">•</span>
                                          <StatusPill tone={RECHARGE_STATUS_TONE[tx.rechargeStatus]}>
                                            {RECHARGE_STATUS_LABEL[tx.rechargeStatus]}
                                          </StatusPill>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span
                                    className={cn(
                                      "font-data text-data-lg whitespace-nowrap",
                                      tx.points > 0 ? "text-success-700" : "text-neutral-900"
                                    )}
                                  >
                                    {tx.points > 0 ? "+" : ""}{tx.points.toLocaleString()} pts
                                  </span>
                                  {isPickup && (
                                    <div className="text-neutral-400">
                                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {isPickup && isExpanded && tx.rewardReason && (
                                <div className="mt-4 md:pl-14 flex flex-col gap-3 border-t border-neutral-100 pt-4" onClick={(e) => e.stopPropagation()}>
                                  {tx.rewardReason.materials.length > 0 && (
                                    <div>
                                      <p className="text-caption font-semibold text-neutral-500 uppercase tracking-wider mb-2">Materials</p>
                                      <div className="flex flex-col gap-2">
                                        {tx.rewardReason.materials.map((mat, i) => (
                                          <div key={i} className="flex justify-between items-center text-body-sm text-neutral-700 bg-neutral-50 px-3 py-2 rounded-lg">
                                            <span>{mat.category} <span className="text-neutral-400 ml-1">({mat.weight} kg)</span></span>
                                            <span className="font-medium text-neutral-900">+{mat.points} pts</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {tx.rewardReason.bonuses.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-caption font-semibold text-neutral-500 uppercase tracking-wider mb-2">Bonuses</p>
                                      <div className="flex flex-col gap-2">
                                        {tx.rewardReason.bonuses.map((bonus, i) => (
                                          <div key={i} className="flex justify-between items-center text-body-sm text-neutral-700 bg-success-50/50 px-3 py-2 rounded-lg">
                                            <span>{bonus.name}</span>
                                            <span className="font-medium text-success-700">+{bonus.points} pts</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <PlatinumGiftModal 
        isOpen={isGiftModalOpen} 
        onClose={() => setIsGiftModalOpen(false)} 
        onClaimed={(gift, date, nextDate) => {
          setSelectedGift(gift);
          setGiftClaimDate(date);
          setNextGiftEligibleDate(nextDate);
          setGiftClaimed(true);
        }} 
      />
    </PageContainer>
  );
}
