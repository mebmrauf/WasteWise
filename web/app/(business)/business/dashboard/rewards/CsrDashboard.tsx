"use client";

import * as React from "react";
import { Heart, Target, Loader2, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/Card";
import { Icon } from "@/components/Icon";
import { getCsrDashboard, getCsrHistory, type CsrDashboardStats, type CsrContribution } from "@/lib/api/csr";
import { formatBdt } from "@/lib/utils";
import { Button } from "@/components/Button";
import { publicEnv } from "@/lib/env";

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · ${date.toLocaleTimeString(
    undefined,
    { hour: "2-digit", minute: "2-digit" },
  )}`;
}

export function CsrDashboard() {
  const [stats, setStats] = React.useState<CsrDashboardStats | null>(null);
  const [history, setHistory] = React.useState<CsrContribution[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    Promise.all([getCsrDashboard(), getCsrHistory()])
      .then(([statsRes, historyRes]) => {
        setStats(statsRes.stats);
        setHistory(historyRes.contributions);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load CSR data");
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-100">
        {error}
      </div>
    );
  }

  return (
    <div className="mt-12 flex flex-col gap-8 animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-full">
          <Heart className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">CSR Contributions</h2>
          <p className="text-neutral-500">Your social and environmental impact through WasteWise.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="p-6 bg-white border border-neutral-100 shadow-sm flex flex-col">
          <span className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2">Total Donated</span>
          <span className="text-3xl font-bold text-emerald-600">৳{stats.totalDonated.toLocaleString()}</span>
        </Card>
        <Card className="p-6 bg-white border border-neutral-100 shadow-sm flex flex-col">
          <span className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2">Contributions</span>
          <span className="text-3xl font-bold text-neutral-900">{stats.totalContributions}</span>
        </Card>
        <Card className="p-6 bg-white border border-neutral-100 shadow-sm flex flex-col">
          <span className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2">Most Supported</span>
          <span className="text-xl font-bold text-neutral-900 line-clamp-2">{stats.mostSupportedCause || "N/A"}</span>
        </Card>
      </div>

      <Card className="overflow-hidden bg-white border border-neutral-100 shadow-sm">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-neutral-900">Contribution History</h3>
        </div>
        
        {history.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            <Heart className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
            <p>No contributions made yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 max-h-[400px] overflow-y-auto">
            {history.map((contribution) => (
              <div key={contribution.id} className="p-4 sm:p-6 hover:bg-neutral-50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h4 className="font-semibold text-neutral-900">{contribution.selectedCause}</h4>
                  <p className="text-sm text-neutral-500 mt-1">
                    {formatDateTime(contribution.createdAt)} • Pickup ID: {contribution.pickupId.slice(0, 8)}
                  </p>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <span className="block font-bold text-emerald-600">৳{contribution.donationAmount.toLocaleString()}</span>
                    {contribution.donationPercentage && (
                      <span className="block text-xs text-neutral-500">{contribution.donationPercentage}% of payment</span>
                    )}
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="shrink-0"
                    onClick={() => window.open(`${publicEnv.NEXT_PUBLIC_API_URL}/csr/receipt/${contribution.id}`, '_blank')}
                  >
                    Receipt <ArrowUpRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
