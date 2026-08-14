"use client";

import * as React from "react";
import { authFetch } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/AuthContext";
import { Loader2, Store, ClipboardList, CheckCircle2, TrendingUp, Star, Truck, Calendar, ChevronRight } from "lucide-react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/Button";
import { format } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          icon={Store} 
          label="Open Marketplace Requests" 
          value={stats.openRequests} 
          color="blue" 
          href="/recycling/marketplace"
        />
        <StatCard 
          icon={ClipboardList} 
          label="Active Quotations" 
          value={stats.activeQuotations} 
          color="amber" 
          href="/recycling/quotations"
        />
        <StatCard 
          icon={Truck} 
          label="Active Pickups" 
          value={stats.scheduledPickups} 
          color="indigo" 
          href="/recycling/accepted-collections"
        />
        <StatCard 
          icon={CheckCircle2} 
          label="Completed Collections" 
          value={stats.completedPickups} 
          color="emerald" 
          href="/recycling/collection-history"
        />
        <StatCard 
          icon={TrendingUp} 
          label="Monthly Purchase Value" 
          value={`৳${stats.totalPurchaseValue.toLocaleString()}`} 
          color="primary" 
        />
        
        {/* Company Rating Card */}
        <div className="rounded-2xl border border-neutral-200 bg-neutral-0 p-6 shadow-sm flex flex-col justify-between hover:border-emerald-200 transition-colors">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
              <Star className="w-6 h-6 fill-current" />
            </div>
            <div className="text-right">
              <span className="text-caption text-neutral-500 font-medium">Average Rating</span>
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-h4 text-neutral-900">{Number(stats.avgRating).toFixed(1)}</span>
                <span className="text-body-sm text-neutral-400">/ 5.0</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between text-body-sm">
            <span className="text-neutral-500">{stats.totalReviews} Reviews</span>
            <span className="text-emerald-600 font-semibold">{stats.successRate}% Success Rate</span>
          </div>
        </div>
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
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
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
      
      {/* Performance Chart */}
      <div className="rounded-2xl border border-neutral-200 bg-neutral-0 shadow-sm overflow-hidden p-6">
        <h3 className="text-h5 text-neutral-900 mb-6">Collection Performance (Last 6 Months)</h3>
        
        <div className="h-64 flex items-end gap-2 sm:gap-6 justify-between pt-4 border-b border-neutral-100 pb-2">
          {performanceChart.map((item: any, idx: number) => {
            // Find max for scaling
            const maxVal = Math.max(...performanceChart.map((i: any) => i.count), 1);
            const heightPct = (item.count / maxVal) * 100;
            
            return (
              <div key={idx} className="flex flex-col items-center flex-1 group">
                <div className="w-full flex justify-center relative h-full items-end">
                  {/* Tooltip */}
                  <div className="absolute -top-8 bg-neutral-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    {item.count} pickups
                  </div>
                  {/* Bar */}
                  <div 
                    className="w-full max-w-[48px] bg-emerald-100 group-hover:bg-emerald-500 rounded-t-sm transition-all duration-500" 
                    style={{ height: `${Math.max(heightPct, 2)}%` }}
                  />
                </div>
                <span className="text-xs text-neutral-400 mt-3 font-medium uppercase tracking-wider">{item.month}</span>
              </div>
            );
          })}
        </div>
      </div>
      
    </div>
  );
}

function StatCard({ icon: IconCmp, label, value, color, href }: any) {
  const colorStyles: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    indigo: "bg-indigo-50 text-indigo-600",
    primary: "bg-primary-50 text-primary-600",
  };
  
  const content = (
    <div className={cn("rounded-2xl border border-neutral-200 bg-neutral-0 p-6 shadow-sm flex flex-col justify-between transition-colors", href && "hover:border-emerald-300 cursor-pointer")}>
      <div className="flex items-start justify-between">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", colorStyles[color])}>
          <IconCmp className="w-6 h-6" />
        </div>
        <div className="text-right">
          <span className="text-caption text-neutral-500 font-medium">{label}</span>
          <h3 className="text-h3 text-neutral-900 mt-1">{value}</h3>
        </div>
      </div>
    </div>
  );
  
  if (href) {
    return <Link href={href} className="block h-full">{content}</Link>;
  }
  return content;
}
