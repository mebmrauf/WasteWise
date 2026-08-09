"use client";

import * as React from "react";
import { Truck, Camera, Gift, ClipboardList } from "lucide-react";
import { PageContainer } from "@/components/PageContainer";
import { DashboardFeatureTile } from "@/components/DashboardFeatureTile";
import { Card } from "@/components/Card";
import { listPickups, type PickupRequestSummary } from "@/lib/api/pickups";
import { getRewardsBalance } from "@/lib/api/rewards";
import { useAuth } from "@/lib/auth/AuthContext";

export default function UserDashboardPage() {
  const { user } = useAuth();
  const [pickups, setPickups] = React.useState<PickupRequestSummary[]>([]);
  const [rewardsBalance, setRewardsBalance] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchDashboardStats() {
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
    }
    fetchDashboardStats();
  }, []);

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

  // In a real app we'd fetch the total recycled weight. We'll default to 0 for now.
  const totalRecycled = 0;

  return (
    <PageContainer className="py-8 max-w-5xl">
      {/* Banner */}
      <div className="bg-[#114E29] text-white p-8 rounded-2xl mb-8 flex flex-col justify-center shadow-lg min-h-[160px]">
        <h1 className="text-display text-white mb-2 font-bold tracking-tight">
          {greeting}, {displayName}!
        </h1>
        <p className="text-white/90 text-body-lg max-w-2xl">
          Ready to make an impact today? Request a pickup, scan waste, or track your active collections right from here.
        </p>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-neutral-200 rounded-2xl w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="flex flex-col p-6 shadow-sm border border-neutral-200 bg-white">
            <span className="text-overline text-neutral-500 mb-2">ACTIVE PICKUPS</span>
            <div className="text-display font-bold text-neutral-900">{activePickups}</div>
          </Card>
          <Card className="flex flex-col p-6 shadow-sm border border-neutral-200 bg-white">
            <span className="text-overline text-neutral-500 mb-2">TOTAL COLLECTED</span>
            <div className="text-display font-bold text-neutral-900">
              {totalRecycled} <span className="text-body text-neutral-500">kg</span>
            </div>
          </Card>
          <Card className="flex flex-col p-6 shadow-sm border border-neutral-200 bg-white">
            <span className="text-overline text-neutral-500 mb-2">GREEN POINTS</span>
            <div className="text-display font-bold text-neutral-900">
              {rewardsBalance} <span className="text-body text-neutral-500">pts</span>
            </div>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-4">
        <h2 className="text-h4 text-neutral-900 mb-4">Quick Actions</h2>
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
    </PageContainer>
  );
}
