"use client";

import * as React from "react";
import { PageContainer } from "@/components/PageContainer";
import { getMarketplaceRequests, type BulkMarketplaceRequest } from "@/lib/api/marketplace";
import { MapPin, CheckCircle2, Star } from "lucide-react";
import { format } from "date-fns";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Icon } from "@/components/Icon";

export default function CollectionHistoryPage() {
  const [requests, setRequests] = React.useState<BulkMarketplaceRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    getMarketplaceRequests()
      .then((data) => {
        if (!cancelled) {
          // Filter for COMPLETED only
          setRequests(data.filter(r => r.status === "COMPLETED"));
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMsg(err.message || "Failed to load history");
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageContainer className="py-8">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-h2 text-neutral-900">Collection History</h1>
          <p className="text-body text-neutral-500 mt-1">
            Review your successfully completed bulk collections.
          </p>
        </div>

        {errorMsg && <ErrorBanner>{errorMsg}</ErrorBanner>}

        {isLoading ? (
          <p className="text-neutral-500">Loading...</p>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-0 p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
            <h3 className="text-h4 text-neutral-900">No completed collections yet</h3>
            <p className="mt-2 text-body text-neutral-500 mb-6">
              Collections you complete will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((req) => {
              const acceptedQuote = req.quotations?.find((q: any) => q.status === "ACCEPTED");
              
              let wasteTypesArr: any[] = [];
              if (typeof req.wasteTypes === "string") {
                try { wasteTypesArr = JSON.parse(req.wasteTypes); } catch (e) {}
              } else if (Array.isArray(req.wasteTypes)) {
                wasteTypesArr = req.wasteTypes;
              }

              return (
                <div key={req.id} className="rounded-xl border border-neutral-200 bg-neutral-0 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">
                        COMPLETED
                      </span>
                      <p className="text-caption text-neutral-400 mt-2">
                        {format(new Date(req.updatedAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    {req.rating && (
                      <div className="flex items-center gap-1 text-warning-500">
                        <Icon icon={Star} size="sm" className="fill-current" />
                        <span className="text-sm font-semibold">{req.rating}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-h5 text-neutral-900">{req.business?.fullName}</h3>
                    <p className="text-body-sm font-medium text-neutral-700 mt-1 line-clamp-1">
                      {wasteTypesArr.map(w => w.category).join(", ")}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 text-body-sm text-neutral-600">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-neutral-400 flex-shrink-0" />
                      <span className="line-clamp-1">{req.pickupAddress}</span>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-neutral-100 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-caption text-neutral-500">Verified Weight</p>
                      <p className="text-body font-bold text-neutral-900">
                        {req.verifiedTotalWeightKg || req.estimatedWeightKg} kg
                      </p>
                    </div>
                    <div>
                      <p className="text-caption text-neutral-500">Purchase Price</p>
                      <p className="text-body font-bold text-primary-600">
                        ৳{acceptedQuote?.purchasePrice.toLocaleString() || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
