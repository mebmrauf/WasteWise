"use client";

import * as React from "react";
import { getMyQuotations, type MarketplaceQuotation } from "@/lib/api/marketplace";
import { Package, MapPin, Calendar, Clock, Loader2, CheckCircle2, XCircle, Clock4 } from "lucide-react";
import { Icon } from "@/components/Icon";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function RecyclingQuotationsView() {
  const [quotations, setQuotations] = React.useState<MarketplaceQuotation[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    getMyQuotations()
      .then((data) => {
        if (!cancelled) setQuotations(data);
      })
      .catch(console.error)
      .finally(() => {
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

  if (quotations.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-neutral-0 p-8 text-center mt-6">
        <h3 className="text-h4 text-neutral-900">No quotations submitted</h3>
        <p className="mt-2 text-body text-neutral-500">
          You haven't submitted any quotations to the bulk marketplace yet.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {quotations.map((quote) => {
        const req = quote.request!;
        
        let statusConfig = { icon: Clock4, color: "text-blue-600 bg-blue-50 border-blue-200", label: "Pending" };
        
        if (quote.status === "ACCEPTED") {
          statusConfig = { icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-200", label: "Accepted" };
        } else if (quote.status === "REJECTED") {
          statusConfig = { icon: XCircle, color: "text-red-600 bg-red-50 border-red-200", label: "Rejected" };
        } else if (quote.status === "PENDING") {
          if (req.status === "BIDDING_CLOSED") {
            if (quote.isHighestBid) {
              statusConfig = { icon: Clock4, color: "text-amber-600 bg-amber-50 border-amber-200", label: "Waiting for Decision" };
            } else {
              statusConfig = { icon: XCircle, color: "text-neutral-500 bg-neutral-100 border-neutral-200", label: "Not Selected" };
            }
          } else if (req.status !== "OPEN_FOR_BIDDING") {
             // Request closed without this quote being selected
             statusConfig = { icon: XCircle, color: "text-neutral-500 bg-neutral-100 border-neutral-200", label: "Not Selected" };
          }
        }

        return (
          <div key={quote.id} className="rounded-2xl border border-neutral-200 bg-neutral-0 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-neutral-300 transition-colors">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-3">
                {req.business?.avatarUrl ? (
                  <img src={req.business.avatarUrl} alt={req.business.fullName} className="w-10 h-10 rounded-full object-cover bg-neutral-100" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                    {req.business?.fullName.charAt(0) || "B"}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-neutral-900">{req.business?.fullName}</h3>
                  <div className="flex items-center text-body-sm text-neutral-500 gap-1">
                    <Icon icon={MapPin} size="sm" />
                    <span>{req.pickupAddress}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-body-sm">
                <div className="bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-100">
                  <span className="text-neutral-500 block text-xs mb-0.5">Offered Price</span>
                  <span className="font-semibold text-neutral-900">৳{quote.purchasePrice.toLocaleString()}</span>
                </div>
                <div className="bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-100">
                  <span className="text-neutral-500 block text-xs mb-0.5">Est. Pickup Date</span>
                  <span className="font-semibold text-neutral-900 flex items-center gap-1">
                    <Icon icon={Calendar} size="sm" className="w-3 h-3" />
                    {format(new Date(quote.estimatedPickupDate), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-100">
                  <span className="text-neutral-500 block text-xs mb-0.5">Submitted On</span>
                  <span className="font-semibold text-neutral-900">
                    {format(new Date(quote.createdAt), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 min-w-[150px]">
              <div className={cn("px-3 py-1.5 rounded-full border flex items-center gap-1.5 text-sm font-medium", statusConfig.color)}>
                <Icon icon={statusConfig.icon} className="w-4 h-4" />
                <span>{statusConfig.label}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
