"use client";

import * as React from "react";
import Link from "next/link";
import { Battery, Camera, ClipboardList, Gift, Leaf, Medal, Package, Truck, Wind, BadgeCheck, Recycle } from "lucide-react";
import { PageContainer } from "@/components/PageContainer";
import { StatusPill } from "@/components/StatusPill";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { DashboardFeatureTile } from "@/components/DashboardFeatureTile";
import { listPickups, type PickupRequestSummary } from "@/lib/api/pickups";
import { PICKUP_STATUS_TONE, PICKUP_STATUS_LABEL } from "@/lib/pickupStatus";
import { getRewardsBalance } from "@/lib/api/rewards";
import { useAuth } from "@/lib/auth/AuthContext";
import { WasteSoldChart, type ChartDataPoint } from "@/components/WasteSoldChart";
import { Icon } from "@/components/Icon";

export default function UserDashboardPage() {
  const { user } = useAuth();
  const [pickups, setPickups] = React.useState<PickupRequestSummary[]>([]);
  const [rewardsBalance, setRewardsBalance] = React.useState(0);
  const [membershipLevel, setMembershipLevel] = React.useState<"BRONZE" | "SILVER" | "GOLD" | "PLATINUM">((user?.membershipLevel as any) || "BRONZE");
  const [isLoading, setIsLoading] = React.useState(true);

  const [rewardsData, setRewardsData] = React.useState<any>(null);

  const fetchData = React.useCallback(async () => {
    try {
      const [pickupsData, fetchedRewards] = await Promise.all([
        listPickups().catch(() => ({ pickups: [] })),
        getRewardsBalance().catch(() => ({ greenPointsBalance: 0, membershipLevel: user?.membershipLevel || "BRONZE" })),
      ]);
      setPickups(pickupsData.pickups);
      setRewardsBalance(fetchedRewards.greenPointsBalance);
      if (fetchedRewards.membershipLevel) {
        setMembershipLevel(fetchedRewards.membershipLevel as any);
      }
      setRewardsData(fetchedRewards);
    } catch (err) {
      console.error("Failed to load dashboard stats", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.membershipLevel]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activePickups = pickups.filter((p) => !["COMPLETED", "CANCELLED"].includes(p.status)).length;
  const displayName = user?.fullName?.trim() || "User";

  // Calculate dynamic greeting based on time of day
  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour >= 5 && hour < 12) {
    greeting = "Good morning";
  } else if (hour >= 12 && hour < 17) {
    greeting = "Good afternoon";
  }

  const currentYear = new Date().getFullYear().toString();
  const completedPickups = pickups.filter(p => p.status === "COMPLETED");

  let totalRecycled = 0;
  let totalEarnings = 0;
  let co2OffsetBase = 0;
  let treesSavedBase = 0;

  const yearlyMap: Record<string, number> = {};
  const monthlyMap: Record<string, number> = {};

  completedPickups.forEach(p => {
    let weight = 0;
    p.items.forEach(item => {
      const w = item.exactWeightKg || 0;
      weight += w;

      const bidPerKg = p.bidAmountsPerKg?.[item.category] || 0;
      totalEarnings += w * bidPerKg;

      // Category-specific eco impact multipliers
      switch (item.category) {
        case "PAPER":
          treesSavedBase += w * 0.017;
          co2OffsetBase += w * 1.0;
          break;
        case "PLASTIC":
          co2OffsetBase += w * 1.5;
          break;
        case "METAL":
          co2OffsetBase += w * 2.5;
          break;
        case "GLASS":
          co2OffsetBase += w * 0.3;
          break;
        case "ORGANIC":
          co2OffsetBase += w * 0.5;
          break;
        case "ELECTRONIC":
          co2OffsetBase += w * 1.0;
          break;
        default:
          co2OffsetBase += w * 0.5;
          break;
      }
    });
    totalRecycled += weight;

    const dateStr = p.createdAt.split("T")[0];
    if (dateStr) {
      const year = dateStr.split("-")[0];
      const monthNum = parseInt(dateStr.split("-")[1] || "1", 10);

      yearlyMap[year] = (yearlyMap[year] || 0) + weight;

      if (year === currentYear) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthLabel = monthNames[monthNum - 1] || "Unknown";
        monthlyMap[monthLabel] = (monthlyMap[monthLabel] || 0) + weight;
      }
    }
  });

  const areaData: ChartDataPoint[] = Object.entries(yearlyMap)
    .map(([label, weight]) => ({ label, weight }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const barData: ChartDataPoint[] = Object.entries(monthlyMap)
    .map(([label, weight]) => ({ label, weight }))
    .sort((a, b) => monthOrder.indexOf(a.label) - monthOrder.indexOf(b.label));

  const co2Offset = co2OffsetBase.toFixed(1);
  const treesSaved = treesSavedBase.toFixed(2);

  // Calculate total earnings across all completed pickups
  let totalEarningsCalc = 0;
  completedPickups.forEach(p => {
    p.items.forEach(item => {
      const w = item.exactWeightKg || 0;
      const bidPerKg = p.bidAmountsPerKg?.[item.category] || 0;
      totalEarningsCalc += w * bidPerKg;
    });
  });

  // Recent Pickups logic (up to 4 most recent requests)
  const recentPickupsList = [...pickups]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  // Active tracking banner logic
  const activePickupList = pickups.filter((p) => !["COMPLETED", "CANCELLED"].includes(p.status));
  const statusPriority: Record<string, number> = {
    VERIFYING_WEIGHTS: 4,
    ARRIVED: 3,
    EN_ROUTE: 2,
    ASSIGNED: 1,
    PENDING: 0,
  };
  const sortedActivePickups = [...activePickupList].sort((a, b) => {
    return (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0);
  });
  const nextActivePickup = sortedActivePickups.length > 0 ? sortedActivePickups[0] : null;

  const isBusiness = user?.accountType === "BUSINESS";
  const bulkPickups = pickups.filter(p => p.isBulk);
  const openBulkRequests = bulkPickups.filter(p => p.status === "PENDING").length;
  const activeBulkRequests = bulkPickups.filter(p => ["ASSIGNED", "EN_ROUTE", "ARRIVED", "VERIFYING_WEIGHTS"].includes(p.status)).length;
  const completedBulkPickups = bulkPickups.filter(p => p.status === "COMPLETED").length;
  const totalBulkRecycled = bulkPickups.filter(p => p.status === "COMPLETED").reduce((acc, p) => acc + p.items.reduce((sum, item) => sum + (item.exactWeightKg || 0), 0), 0);

  return (
    <PageContainer className="py-8 max-w-6xl">
      {/* Banner & Primary CTA */}
      <Card className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 mb-8 bg-gradient-to-br from-green-50 to-emerald-50 border-emerald-100 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 mb-2">
            {greeting}, {displayName}!
          </h1>
          <p className="text-neutral-600 text-body max-w-xl">
            Ready to make an impact today? Schedule a pickup or track your active collections.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-6">
          <Button href="/dashboard/pickups/new" size="lg" className="font-bold px-8 shadow-sm border-none bg-emerald-600 hover:bg-emerald-700 text-white">
            Request Pickup
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-neutral-200 rounded-lg w-full" />
        </div>
      ) : (
        <>


          <h2 className="text-xl font-semibold text-neutral-900 mb-4">Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* 3 Top-Level Stats */}
            <Card className="p-6 text-center shadow-sm hover:shadow-md transition-shadow relative overflow-hidden bg-white">
              <span className="text-sm font-medium text-neutral-500 uppercase tracking-wider block mb-2">TOTAL EARNED</span>
              <div className="text-4xl font-bold text-neutral-900">
                ৳{totalEarnings.toFixed(0)}
              </div>
            </Card>

            <Card className="p-6 text-center shadow-sm hover:shadow-md transition-shadow relative overflow-hidden bg-white">
              <div className="absolute right-4 top-4">
                {activePickups > 0 && (
                  <Link href="/dashboard/pickups" className="text-xs text-emerald-600 hover:underline font-medium">
                    View &rarr;
                  </Link>
                )}
              </div>
              <span className="text-sm font-medium text-neutral-500 uppercase tracking-wider block mb-2">ACTIVE PICKUPS</span>
              <div className="text-4xl font-bold text-neutral-900">{activePickups}</div>
            </Card>

            <Card className="p-6 text-center shadow-sm hover:shadow-md transition-shadow relative overflow-hidden bg-gradient-to-tr from-green-50 to-emerald-50 border-emerald-100">
              <span className="text-sm font-medium text-emerald-700 uppercase tracking-wider block mb-2">ECO IMPACT</span>
              <div className="flex flex-col items-center gap-2 mt-1">
                <div className="flex items-center gap-2">
                  <Icon icon={Wind} size="sm" className="text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-900">{co2Offset} kg CO₂ saved</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon icon={Leaf} size="sm" className="text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-900">{treesSaved} trees planted</span>
                </div>
              </div>
            </Card>
          </div>

          <div className="mb-10">
            <h2 className="text-xl font-semibold text-neutral-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <DashboardFeatureTile
                icon={Truck}
                label="Request Pickup"
                description="Schedule a smart pickup easily."
                href="/dashboard/pickups/new"
                className="p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-neutral-100 bg-white"
                iconContainerClassName="bg-emerald-100 text-emerald-600"
              />
              <DashboardFeatureTile
                icon={ClipboardList}
                label="My Pickups"
                description="Track and manage active requests."
                href="/dashboard/pickups"
                className="p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-neutral-100 bg-white"
                iconContainerClassName="bg-blue-100 text-blue-600"
              />
              <DashboardFeatureTile
                icon={Camera}
                label="Scan Waste"
                description="Use AI to identify materials."
                href="/waste-recognition"
                className="p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-neutral-100 bg-white"
                iconContainerClassName="bg-purple-100 text-purple-600"
              />
              <DashboardFeatureTile
                icon={Gift}
                label="Green Rewards"
                description="View and redeem your points."
                href="/dashboard/rewards"
                className="p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-neutral-100 bg-white"
                iconContainerClassName="bg-yellow-100 text-yellow-600"
              />
              <DashboardFeatureTile
                icon={BadgeCheck}
                label="Verified Collectors"
                description="Find trusted collectors near you."
                href="/dashboard/collectors"
                className="p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-neutral-100 bg-white"
                iconContainerClassName="bg-indigo-100 text-indigo-600"
              />
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-xl font-semibold text-neutral-900 mb-4">Recycling History</h2>

            {totalRecycled === 0 ? (
              <Card className="flex flex-col items-center justify-center p-12 text-center bg-neutral-50 border border-dashed border-neutral-300 shadow-none min-h-[300px]">
                <Icon icon={Leaf} size="xl" className="text-neutral-400 mb-4" />
                <h3 className="text-lg font-bold text-neutral-900 mb-2">Welcome to WasteWise!</h3>
                <p className="text-sm text-neutral-500 max-w-md mb-6">
                  You haven't recycled anything yet. Request your first pickup to start tracking your environmental impact and earning rewards.
                </p>
                <Button href="/dashboard/pickups/new" className="bg-emerald-600 hover:bg-emerald-700">Schedule First Pickup</Button>
              </Card>
            ) : (
              <WasteSoldChart areaData={areaData} barData={barData} currentYear={currentYear} />
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 items-start">
            {recentPickupsList.length > 0 ? (
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-neutral-900">Recent Requests</h2>
                  <Link href="/dashboard/pickups" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline">
                    View All &rarr;
                  </Link>
                </div>
                <div className="flex flex-col gap-4">
                  {recentPickupsList.map(rp => (
                    <Card key={rp.id} className="flex items-center justify-between p-6 rounded-2xl shadow-sm border border-neutral-100 bg-white hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-5 min-w-0">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-full shrink-0 ${rp.isBulk ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          <Icon icon={rp.isBulk ? Package : Truck} size="md" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-neutral-900 mb-1 truncate">
                            {rp.isBulk ? "Bulk Pickup" : "Smart Pickup"} &bull; {new Date(rp.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </div>
                          <div className="text-sm font-medium text-neutral-500 truncate">
                            {rp.items.map(i => i.category).join(', ')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <StatusPill tone={PICKUP_STATUS_TONE[rp.status]} className="text-xs px-2.5 py-1">
                          {PICKUP_STATUS_LABEL[rp.status]}
                        </StatusPill>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div />
            )}

            <div className="flex flex-col gap-5">
              <h2 className="text-xl font-semibold text-neutral-900">{isBusiness ? "Business Overview" : "Balances & Rewards"}</h2>
              <div className="flex flex-col gap-4">

                {/* Green Points Card (Primary) */}
                <Card className="flex flex-col sm:flex-row items-center justify-between p-6 sm:p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-100">
                  <div className="flex flex-col items-center sm:items-start text-center sm:text-left mb-6 sm:mb-0">
                    <span className="text-sm font-bold text-emerald-700/80 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Icon icon={Gift} size="sm" /> Green Points
                    </span>
                    <div className="text-5xl font-black text-emerald-700 tracking-tight">
                      {rewardsBalance}
                    </div>
                  </div>
                  <Link href="/dashboard/rewards" className="shrink-0 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-emerald-700 transition-colors w-full sm:w-auto text-center">
                    {isBusiness ? "View Rewards" : "Redeem Points"}
                  </Link>
                </Card>

                {/* Grid for Total Sold & Membership */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Left Card: Total Sold (Individual) OR Eco Impact (Business) */}
                  {isBusiness ? (
                    <Card className="flex flex-col p-6 rounded-2xl text-left shadow-sm hover:shadow-md transition-shadow bg-white border border-neutral-100">
                      <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Icon icon={Leaf} size="sm" className="text-emerald-500" /> Eco Impact
                      </span>
                      <div className="flex flex-col gap-2 mt-auto">
                        <div className="text-sm font-medium text-neutral-600"><span className="font-bold text-neutral-900">{rewardsData?.environmentalImpact?.totalWasteRecycledKg || 0}kg</span> Recycled</div>
                        <div className="text-sm font-medium text-neutral-600"><span className="font-bold text-neutral-900">{rewardsData?.environmentalImpact?.totalCo2ReducedKg || 0}kg</span> CO₂ Saved</div>
                      </div>
                    </Card>
                  ) : (
                    <Card className="flex flex-col p-6 rounded-2xl text-left shadow-sm hover:shadow-md transition-shadow bg-white border border-neutral-100">
                      <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Icon icon={Package} size="sm" className="text-neutral-400" /> Total Sold
                      </span>
                      <div className="text-3xl font-black text-neutral-900 tracking-tight mt-auto">
                        {totalRecycled.toFixed(1)} <span className="text-lg font-medium text-neutral-400">kg</span>
                      </div>
                    </Card>
                  )}

                  {/* Membership Card */}
                  {user && (
                    <Card className="flex flex-col p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-white border border-neutral-100 relative overflow-hidden h-full">
                      <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Icon icon={Medal} size="sm" className={
                          membershipLevel === "BRONZE" ? "text-[#CD7F32]" :
                            membershipLevel === "SILVER" ? "text-slate-400" :
                              membershipLevel === "GOLD" ? "text-yellow-500" :
                                membershipLevel === "PLATINUM" ? "text-indigo-500" :
                                  "text-neutral-400"
                        } />
                        {isBusiness ? "Business Tier" : "Membership Tier"}
                      </span>
                      <div className="text-3xl font-black text-neutral-900 tracking-tight mb-5">
                        {membershipLevel.charAt(0) + membershipLevel.slice(1).toLowerCase()}
                      </div>

                      <Link href="/dashboard/rewards" className="mt-auto inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#c2601c] border border-orange-200 hover:bg-orange-50 transition-colors shadow-sm self-start">
                        View Perks
                      </Link>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>

        </>
      )}
    </PageContainer>
  );
}
