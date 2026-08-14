"use client";

import * as React from "react";
import { authFetch } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/AuthContext";
import { Loader2, Truck, Calendar, ChevronRight } from "lucide-react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/Button";
import { format } from "date-fns";
import Link from "next/link";
import { CompanyRatingsPanel } from "@/components/CompanyRatingsPanel";
import { CompanyStatsChart } from "@/components/CompanyStatsChart";

export function RecyclingDashboardView() {
  const { user } = useAuth();
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    authFetch("/marketplace/dashboard/recycling-company")
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Dashboard error:", err);
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!data) return <div className="text-neutral-500">Failed to load dashboard data.</div>;

  const { stats, recentRequests, upcomingCollections, performanceChart } = data;

  return (
    <div className="flex flex-col gap-8 w-full max-w-6xl">
      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
        <CompanyRatingsPanel stats={stats} />
        <CompanyStatsChart performanceChart={performanceChart} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Marketplace Requests */}
        <div className="rounded-2xl border border-neutral-200 bg-neutral-0 shadow-sm overflow-hidden flex flex-col">
          <div className="border-b border-neutral-100 p-6 flex items-center justify-between">
            <h3 className="text-h5 text-neutral-900">Recent Marketplace Requests</h3>
            <Link href="/recycling/marketplace" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
              View All
            </Link>
          </div>
          <div className="flex-1 p-0">
            {recentRequests.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-body-sm">
                No open requests at the moment.
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {recentRequests.map((req: any) => {
                  let wasteTypesStr = "";
                  try {
                    const wt = typeof req.wasteTypes === 'string' ? JSON.parse(req.wasteTypes) : req.wasteTypes;
                    wasteTypesStr = wt.map((w: any) => w.category).join(", ");
                  } catch (e) {}

                  return (
                    <li key={req.id} className="p-4 sm:p-6 hover:bg-neutral-50 transition-colors">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="font-semibold text-neutral-900">{req.business?.fullName}</p>
                          <p className="text-body-sm text-neutral-500 mt-1 line-clamp-1">{wasteTypesStr}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
                            <span className="flex items-center gap-1"><Icon icon={Truck} className="w-3 h-3" /> {req.estimatedWeightKg} kg</span>
                            <span className="flex items-center gap-1"><Icon icon={Calendar} className="w-3 h-3" /> {format(new Date(req.createdAt), "MMM d")}</span>
                          </div>
                        </div>
                        <Link href="/recycling/marketplace">
                          <Button size="sm" variant="secondary">Quote</Button>
                        </Link>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Upcoming Collections */}
        <div className="rounded-2xl border border-neutral-200 bg-neutral-0 shadow-sm overflow-hidden flex flex-col">
          <div className="border-b border-neutral-100 p-6 flex items-center justify-between">
            <h3 className="text-h5 text-neutral-900">Active Pickups</h3>
            <Link href="/recycling/accepted-collections" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
              Manage
            </Link>
          </div>
          <div className="flex-1 p-0">
            {upcomingCollections.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-body-sm">
                You have no active collections.
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {upcomingCollections.map((req: any) => {
                  const pickupDate = req.quotations?.[0]?.estimatedPickupDate;
                  const displayStatus = req.status.replace(/_/g, " ");
                  return (
                    <li key={req.id} className="p-4 sm:p-6 hover:bg-neutral-50 transition-colors">
                      <div className="flex justify-between items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
                              {displayStatus}
                            </span>
                          </div>
                          <p className="font-semibold text-neutral-900">{req.business?.fullName}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                            {pickupDate && (
                              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                <Icon icon={Calendar} className="w-3 h-3" /> {format(new Date(pickupDate), "MMM d, yyyy")}
                              </span>
                            )}
                          </div>
                        </div>
                        <Link href={`/recycling/accepted-collections/${req.id}`} className="p-2 rounded-full hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 transition-colors">
                          <Icon icon={ChevronRight} className="w-5 h-5" />
                        </Link>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
