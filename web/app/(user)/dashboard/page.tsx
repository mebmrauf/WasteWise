"use client";

import * as React from "react";
import Link from "next/link";
import { Camera, ClipboardList, Medal, Leaf, Wind, Truck, Gift, Package } from "lucide-react";
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
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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
  const nextActivePickup = activePickupList.length > 0 ? activePickupList[0] : null;

  return (
    <PageContainer className="py-8 max-w-6xl">
      {/* Banner & Primary CTA */}
      <div className="bg-[#114E29] text-white p-8 rounded-2xl mb-8 flex flex-col md:flex-row md:items-center justify-between shadow-lg min-h-[160px] relative overflow-hidden gap-6">
        <div className="relative z-10">
          <h1 className="text-display text-white mb-2 font-bold tracking-tight">
            {greeting}, {displayName}!
          </h1>
          <p className="text-white/90 text-body-lg max-w-xl">
            Ready to make an impact today? Schedule a pickup or track your active collections.
          </p>
        </div>
        
        <div className="relative z-10 flex items-center gap-6">
          <Button href="/dashboard/pickups/new" size="lg" variant="secondary" className="font-bold px-8 shadow-sm border-none text-green-900 hover:text-green-900">
            Request Pickup
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-neutral-200 rounded-lg w-full" />
        </div>
      ) : (
        <>
          {/* Active Mission Widget (Glanceable) */}
          {nextActivePickup && (
            <div className="mb-8 animate-fade-in-up">
              <h2 className="text-h5 text-neutral-900 mb-3 font-semibold flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                Active Request
              </h2>
              <Card className="p-0 border border-green-200 overflow-hidden bg-white shadow-sm hover:border-green-400 transition-colors">
                <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-700 shadow-inner shrink-0">
                      <Icon icon={Truck} size="sm" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-body text-neutral-900">Your Pickup Request</p>
                        <StatusPill tone={PICKUP_STATUS_TONE[nextActivePickup.status]} className="shadow-sm py-1 px-3 text-[10px]">
                          {PICKUP_STATUS_LABEL[nextActivePickup.status]}
                        </StatusPill>
                      </div>
                      <p className="text-caption text-neutral-500">
                        {new Date(nextActivePickup.timeSlotStart).toLocaleDateString()} &bull; {new Date(nextActivePickup.timeSlotStart).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true})}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:items-end">
                    <Button href={`/dashboard/pickups?pickupId=${nextActivePickup.id}&view=${nextActivePickup.status === 'PENDING' ? 'offers' : 'track'}`} variant="primary" size="sm" className="w-full sm:w-auto shadow-sm bg-green-700 hover:bg-green-800">
                      {nextActivePickup.status === "PENDING" ? "Review Offers" : "Track Live"}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          <h2 className="text-h4 text-neutral-900 mb-4 font-semibold">Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* 3 Top-Level Stats */}
            <Card className="flex flex-col p-6 shadow-sm border border-neutral-200 bg-white hover:border-green-300 transition-colors">
              <span className="text-overline text-neutral-500 mb-2">TOTAL EARNED</span>
              <div className="text-display font-bold text-neutral-900">
                ৳{totalEarnings.toFixed(0)}
              </div>
            </Card>
            
            <Card className="flex flex-col p-6 shadow-sm border border-neutral-200 bg-white hover:border-green-300 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="text-overline text-neutral-500">ACTIVE PICKUPS</span>
                {activePickups > 0 && (
                  <Link href="/dashboard/pickups" className="text-caption text-primary hover:underline font-medium">
                    View &rarr;
                  </Link>
                )}
              </div>
              <div className="text-display font-bold text-neutral-900">{activePickups}</div>
            </Card>

            <Card className="flex flex-col p-6 shadow-sm border border-green-200 bg-[#f0fdf4]">
              <span className="text-overline text-green-700 mb-2">ECO IMPACT</span>
              <div className="flex flex-col gap-2 mt-1">
                <div className="flex items-center gap-2">
                  <Icon icon={Wind} size="sm" className="text-green-600" />
                  <span className="text-body-sm font-semibold text-green-900">{co2Offset} kg CO₂ saved</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon icon={Leaf} size="sm" className="text-green-600" />
                  <span className="text-body-sm font-semibold text-green-900">{treesSaved} trees planted</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="mb-10">
            <h2 className="text-h4 text-neutral-900 mb-4 font-semibold">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <DashboardFeatureTile
                icon={Truck}
                label="Request Pickup"
                description="Schedule a smart pickup easily."
                href="/dashboard/pickups/new"
                className="p-5 shadow-sm border border-neutral-200 bg-white hover:border-green-300"
                iconClassName="p-2 bg-green-100 text-green-700 rounded-full box-content"
              />
              <DashboardFeatureTile
                icon={ClipboardList}
                label="My Pickups"
                description="Track and manage active requests."
                href="/dashboard/pickups"
                className="p-5 shadow-sm border border-neutral-200 bg-white hover:border-blue-300"
                iconClassName="p-2 bg-blue-100 text-blue-700 rounded-full box-content"
              />
              <DashboardFeatureTile
                icon={Camera}
                label="Scan Waste"
                description="Use AI to identify materials."
                href="/waste-recognition"
                className="p-5 shadow-sm border border-neutral-200 bg-white hover:border-purple-300"
                iconClassName="p-2 bg-purple-100 text-purple-700 rounded-full box-content"
              />
              <DashboardFeatureTile
                icon={Gift}
                label="Green Rewards"
                description="View and redeem your points."
                href="/dashboard/rewards"
                className="p-5 shadow-sm border border-neutral-200 bg-white hover:border-yellow-300"
                iconClassName="p-2 bg-yellow-100 text-yellow-700 rounded-full box-content"
              />
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-h4 text-neutral-900 mb-4 font-semibold">Recycling History</h2>
            
            {totalRecycled === 0 ? (
              <Card className="flex flex-col items-center justify-center p-12 text-center bg-neutral-50 border border-dashed border-neutral-300 shadow-none min-h-[300px]">
                <Icon icon={Leaf} size="xl" className="text-neutral-300 mb-4" />
                <h3 className="text-h5 font-bold text-neutral-800 mb-2">Welcome to WasteWise!</h3>
                <p className="text-body text-neutral-500 max-w-md mb-6">
                  You haven't recycled anything yet. Request your first pickup to start tracking your environmental impact and earning rewards.
                </p>
                <Button href="/dashboard/pickups/new">Schedule First Pickup</Button>
              </Card>
            ) : (
              <WasteSoldChart areaData={areaData} barData={barData} currentYear={currentYear} />
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {recentPickupsWithEarnings.length > 0 ? (
              <div>
                <h2 className="text-h4 text-neutral-900 mb-4 font-semibold">Recent Pickups</h2>
                <div className="flex flex-col gap-3">
                  {recentPickupsWithEarnings.map(rp => (
                    <Card key={rp.id} className="flex items-center justify-between p-4 shadow-sm border border-neutral-200 bg-white hover:border-neutral-300 transition-colors">
                      <div>
                        <div className="font-semibold text-neutral-900">{new Date(rp.createdAt).toLocaleDateString()}</div>
                        <div className="text-body-sm text-neutral-500">{rp.items.length} categories &bull; {rp.totalWeight.toFixed(1)} kg</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-700 text-body-lg">৳{rp.totalEarnings.toFixed(0)}</div>
                        <div className="text-caption text-neutral-400 uppercase tracking-wider">Earned</div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div />
            )}

            <div className="flex flex-col gap-4">
              <h2 className="text-h4 text-neutral-900 mb-4 font-semibold">Balances & Rewards</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="flex flex-col p-6 shadow-none border border-neutral-200 bg-white">
                  <span className="text-caption text-neutral-500 uppercase tracking-widest mb-2">Total Sold</span>
                  <div className="text-h2 font-bold text-neutral-900">
                    {totalRecycled.toFixed(1)} <span className="text-body text-neutral-500 font-normal">kg</span>
                  </div>
                </Card>
                
                <Card className="flex flex-col p-6 shadow-none border border-neutral-200 bg-white">
                  <span className="text-caption text-neutral-500 uppercase tracking-widest mb-2">Green Points</span>
                  <div className="text-h2 font-bold text-neutral-900 flex items-center justify-between">
                    <span>{rewardsBalance} <span className="text-body text-neutral-500 font-normal">pts</span></span>
                    <Link href="/dashboard/rewards" className="text-body-sm text-primary hover:underline font-medium tracking-normal">
                      Redeem &rarr;
                    </Link>
                  </div>
                </Card>
              </div>

              {user && (
                <Card className="flex flex-col p-6 shadow-none border border-neutral-200 bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-caption text-neutral-500 uppercase tracking-widest block mb-1">Membership</span>
                      <div className="text-h3 font-bold text-neutral-900">{user.membershipLevel}</div>
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
