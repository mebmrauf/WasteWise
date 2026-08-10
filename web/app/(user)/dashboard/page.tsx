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
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchData = React.useCallback(async () => {
    try {
      const [pickupsData, rewardsData] = await Promise.all([
        listPickups().catch(() => ({ pickups: [] })),
        getRewardsBalance().catch(() => ({ greenPointsBalance: 0 })),
      ]);
      setPickups(pickupsData.pickups);
      setRewardsBalance(rewardsData.greenPointsBalance);
    } catch (err) {
      console.error("Failed to load dashboard stats", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  // Recent Pickups logic
  const recentPickupsWithEarnings = [...completedPickups]
    .sort((a, b) => new Date(b.timeSlotStart).getTime() - new Date(a.timeSlotStart).getTime())
    .slice(0, 3)
    .map(p => {
      let weight = 0;
      let earnings = 0;
      p.items.forEach(item => {
        const w = item.exactWeightKg || 0;
        weight += w;
        const bidPerKg = p.bidAmountsPerKg?.[item.category] || 0;
        earnings += w * bidPerKg;
      });
      return { ...p, totalWeight: weight, totalEarnings: earnings };
    });

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
          {/* Active Mission Widget (Glanceable) */}
          {nextActivePickup && (
            <div className="mb-8 animate-fade-in-up">
              <h2 className="text-xl font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                Active Request
              </h2>
              <Card className="p-0 border border-emerald-100 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
                      <Icon icon={Truck} size="md" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-semibold text-neutral-900">Your Pickup Request</p>
                        <StatusPill tone={PICKUP_STATUS_TONE[nextActivePickup.status]} className="shadow-sm py-1 px-3 text-xs">
                          {PICKUP_STATUS_LABEL[nextActivePickup.status]}
                        </StatusPill>
                      </div>
                      <p className="text-sm text-neutral-500">
                        {new Date(nextActivePickup.timeSlotStart).toLocaleDateString()} &bull; {new Date(nextActivePickup.timeSlotStart).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true})}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:items-end">
                    <Button href={`/dashboard/pickups?pickupId=${nextActivePickup.id}&view=${nextActivePickup.status === 'PENDING' ? 'offers' : 'track'}`} className="w-full sm:w-auto shadow-sm bg-emerald-600 hover:bg-emerald-700">
                      {nextActivePickup.status === "PENDING" ? "Review Offers" : (["EN_ROUTE", "ARRIVED", "VERIFYING_WEIGHTS"].includes(nextActivePickup.status) ? "Track Live" : "View Details")}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {recentPickupsWithEarnings.length > 0 ? (
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 mb-4">Recent Pickups</h2>
                <div className="flex flex-col gap-3">
                  {recentPickupsWithEarnings.map(rp => (
                    <Card key={rp.id} className="flex items-center justify-between p-5 shadow-sm border border-neutral-100 bg-white hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shrink-0">
                          <Icon icon={Recycle} size="sm" />
                        </div>
                        <div>
                          <div className="font-semibold text-neutral-900">{new Date(rp.timeSlotStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                          <div className="text-sm text-neutral-500">{rp.items.length} categories &bull; {rp.totalWeight.toFixed(1)} kg</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-emerald-600">৳{rp.totalEarnings.toFixed(0)}</div>
                        <div className="text-xs text-neutral-400 uppercase tracking-wider">Earned</div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div />
            )}

            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">Balances & Rewards</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="flex flex-col p-6 text-center shadow-sm hover:shadow-md transition-shadow relative overflow-hidden bg-white">
                  <span className="text-sm font-medium text-neutral-500 uppercase tracking-wider block mb-2">Total Sold</span>
                  <div className="text-4xl font-bold text-neutral-900">
                    {totalRecycled.toFixed(1)} <span className="text-base text-neutral-500 font-normal">kg</span>
                  </div>
                </Card>
                
                <Card className="flex flex-col p-6 text-center shadow-sm hover:shadow-md transition-shadow relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 border-emerald-100">
                  <span className="text-sm font-medium text-emerald-700 uppercase tracking-wider block mb-2">Green Points</span>
                  <div className="text-4xl font-bold text-emerald-700">
                    {rewardsBalance}
                  </div>
                  <Link href="/dashboard/rewards" className="absolute right-4 top-4 text-xs text-emerald-600 hover:underline font-medium">
                    Redeem &rarr;
                  </Link>
                </Card>
              </div>

              {user && (
                <Card className="flex flex-col p-6 shadow-sm hover:shadow-md transition-shadow bg-white border-neutral-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-neutral-500 uppercase tracking-wider block mb-1">Membership</span>
                      <div className="text-2xl font-bold text-neutral-900">{user.membershipLevel}</div>
                    </div>
                    <Icon 
                      icon={Medal} 
                      className={
                        user.membershipLevel === "BRONZE" ? "text-[#CD7F32]" :
                        user.membershipLevel === "SILVER" ? "text-slate-400" :
                        user.membershipLevel === "GOLD" ? "text-yellow-500" :
                        user.membershipLevel === "PLATINUM" ? "text-indigo-500" :
                        "text-neutral-300"
                      } 
                      size="xl" 
                    />
                  </div>
                </Card>
              )}
            </div>
          </div>
          
        </>
      )}
    </PageContainer>
  );
}
