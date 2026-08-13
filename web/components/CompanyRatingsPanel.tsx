"use client";

import * as React from "react";
import { Star, Store, ClipboardList, CheckCircle2, TrendingUp, Truck } from "lucide-react";
import { Card } from "@/components/Card";
import { Icon } from "@/components/Icon";
import Link from "next/link";

interface DashboardStats {
  openRequests: number;
  activeQuotations: number;
  scheduledPickups: number;
  completedPickups: number;
  totalPurchaseValue: number;
  avgRating: number;
  totalReviews: number;
  successRate: number;
}

export function CompanyRatingsPanel({
  stats,
}: {
  stats: DashboardStats;
}) {
  return (
    <Card className="glass-panel p-6 flex flex-col h-[400px] border-0 shadow-lg rounded-2xl md:col-span-2 lg:col-span-1">
      <div className="flex flex-col h-full">
        {/* Header Summary */}
        <div className="flex items-center gap-4 pb-6 border-b border-neutral-200/50 shrink-0">
          <div className="flex flex-col items-center justify-center p-4 bg-orange-50 rounded-2xl">
            <span className="text-4xl font-heading font-bold text-orange-600">
              {stats.avgRating ? Number(stats.avgRating).toFixed(1) : "0.0"}
            </span>
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Icon
                  key={star}
                  icon={Star}
                  className={`h-3 w-3 ${
                    star <= Math.round(stats.avgRating || 0)
                      ? "fill-orange-500 text-orange-500"
                      : "fill-transparent text-neutral-300"
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-orange-600 mt-2">
              {stats.totalReviews} {stats.totalReviews === 1 ? "Review" : "Reviews"}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-h4 font-heading text-neutral-900 mb-1">Reputation</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Your overall company score. Higher ratings help you win more business!
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="flex flex-col flex-1 pt-6 overflow-hidden">
          <h4 className="text-body-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2 shrink-0">
            <Icon icon={Store} className="h-4 w-4 text-emerald-600" />
            Company Overview
          </h4>
          
          <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar pb-2">
            <Link href="/recycling/marketplace" className="bg-white/50 rounded-xl p-3 border border-white/40 shadow-sm flex items-center justify-between hover:-translate-y-0.5 transition-transform">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Icon icon={Store} className="w-4 h-4" /></div>
                <span className="text-sm font-medium text-neutral-700">Open Requests</span>
              </div>
              <span className="font-bold text-neutral-900">{stats.openRequests}</span>
            </Link>

            <Link href="/recycling/quotations" className="bg-white/50 rounded-xl p-3 border border-white/40 shadow-sm flex items-center justify-between hover:-translate-y-0.5 transition-transform">
              <div className="flex items-center gap-3">
                <div className="bg-amber-50 p-2 rounded-lg text-amber-600"><Icon icon={ClipboardList} className="w-4 h-4" /></div>
                <span className="text-sm font-medium text-neutral-700">Active Quotes</span>
              </div>
              <span className="font-bold text-neutral-900">{stats.activeQuotations}</span>
            </Link>

            <Link href="/recycling/accepted-collections" className="bg-white/50 rounded-xl p-3 border border-white/40 shadow-sm flex items-center justify-between hover:-translate-y-0.5 transition-transform">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><Icon icon={Truck} className="w-4 h-4" /></div>
                <span className="text-sm font-medium text-neutral-700">Active Pickups</span>
              </div>
              <span className="font-bold text-neutral-900">{stats.scheduledPickups}</span>
            </Link>

            <Link href="/recycling/collection-history" className="bg-white/50 rounded-xl p-3 border border-white/40 shadow-sm flex items-center justify-between hover:-translate-y-0.5 transition-transform">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600"><Icon icon={CheckCircle2} className="w-4 h-4" /></div>
                <span className="text-sm font-medium text-neutral-700">Completed</span>
              </div>
              <span className="font-bold text-neutral-900">{stats.completedPickups}</span>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
