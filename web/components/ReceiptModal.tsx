"use client";

import * as React from "react";
import { format } from "date-fns";
import { CheckCircle2, X, Receipt, Loader2, Star } from "lucide-react";
import { Icon } from "@/components/Icon";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Button } from "@/components/Button";
import { getPickupDetail, getPickupTracking, type PickupRequestDetail, type PickupTracking } from "@/lib/api/pickups";
import { formatBdt } from "@/lib/utils";

type LoadState = "loading" | "ready" | "error";

export function ReceiptModal({ pickupId, onClose }: { pickupId: string; onClose: () => void }) {
  const [loadState, setLoadState] = React.useState<LoadState>("loading");
  const [pickupDetail, setPickupDetail] = React.useState<PickupRequestDetail | null>(null);
  const [tracking, setTracking] = React.useState<PickupTracking | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoadState("loading");

    Promise.all([
      getPickupDetail(pickupId),
      getPickupTracking(pickupId),
    ])
      .then(([detailRes, trackingRes]) => {
        if (cancelled) return;
        setPickupDetail(detailRes.pickup);
        setTracking(trackingRes);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [pickupId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div 
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-neutral-0 shadow-lg border border-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100/80 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 transition-colors"
          aria-label="Close"
        >
          <Icon icon={X} size="sm" />
        </button>

        {loadState === "loading" && (
          <div className="flex flex-col items-center justify-center p-12 gap-4">
            <Icon icon={Loader2} size="lg" className="animate-spin text-role-user-500" />
            <p className="text-body-sm text-neutral-500">Loading receipt...</p>
          </div>
        )}

        {loadState === "error" && (
          <div className="p-6 pt-12">
            <ErrorBanner>Couldn't load the receipt. Please try again later.</ErrorBanner>
          </div>
        )}

        {loadState === "ready" && pickupDetail && tracking && (() => {
          let totalPaid = 0;
          const itemsBreakdown = pickupDetail.items.map((item) => {
            const bid = pickupDetail.bidAmountsPerKg?.[item.category] ?? 0;
            const exactWeight = item.exactWeightKg ?? 0;
            const total = exactWeight * bid;
            totalPaid += total;
            return {
              category: item.category,
              exactWeight,
              bid,
              total,
            };
          });
          const pointsEarned = pickupDetail.pointsEarned ?? 0;

          return (
            <>
              {/* Header */}
              <div className="flex flex-col items-center gap-2 bg-role-user-50 p-6 pt-10 border-b border-dashed border-neutral-300">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-role-user-100 text-role-user-600">
                  <Icon icon={Receipt} size="lg" />
                </div>
                <h2 className="text-h3 font-heading text-neutral-900">WasteWise</h2>
                <p className="text-caption text-neutral-500">Transaction Receipt</p>
                <div className="mt-2 flex items-center gap-1 text-success-600 bg-success-50 px-2 py-1 rounded-full text-caption font-medium">
                  <Icon icon={CheckCircle2} size="sm" />
                  Completed
                </div>
              </div>

              {/* Details */}
              <div className="flex flex-col p-6 gap-6">
                <div className="flex flex-col gap-3 text-body-sm text-neutral-600">
                  <div className="flex justify-between">
                    <span>Date</span>
                    <span className="font-medium text-neutral-900">
                      {format(new Date(pickupDetail.updatedAt), "MMM d, yyyy h:mm a")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Receipt ID</span>
                    <span className="font-medium font-data text-neutral-900 uppercase">
                      {pickupDetail.id.slice(-8)}
                    </span>
                  </div>
                  {tracking.collector && (
                    <div className="flex justify-between">
                      <span>Collector</span>
                      <span className="font-medium text-neutral-900">{tracking.collector.fullName}</span>
                    </div>
                  )}
                </div>

                <hr className="border-t border-dashed border-neutral-300" />

                {/* Items */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-body-sm font-bold text-neutral-900 uppercase tracking-wider">Items Collected</h3>
                  {itemsBreakdown.map((item) => (
                    <div key={item.category} className="flex flex-col gap-1">
                      <div className="flex justify-between text-body font-medium text-neutral-900">
                        <span>{item.category}</span>
                        <span className="font-data">{formatBdt(item.total)}</span>
                      </div>
                      <div className="text-caption text-neutral-500">
                        {item.exactWeight} kg @ {formatBdt(item.bid)}/kg
                      </div>
                    </div>
                  ))}
                </div>

                <hr className="border-t border-dashed border-neutral-300" />

                {/* Totals */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-h4 text-neutral-900">
                    <span>Total Paid</span>
                    <span className="font-data text-success-600">{formatBdt(totalPaid)}</span>
                  </div>
                  <div className="flex justify-between items-center text-body-sm text-neutral-600">
                    <span>Green Points Earned</span>
                    <span className="font-medium text-role-user-600">+{pointsEarned} Points</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-neutral-50 p-4 border-t border-dashed border-neutral-300">
                {pickupDetail.rating ? (
                  <div className="flex flex-col items-center justify-center p-2 text-center">
                    <p className="text-body-sm font-medium text-neutral-900 mb-2">You rated this collector</p>
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Icon 
                          key={star} 
                          icon={Star} 
                          className={`h-5 w-5 ${
                            star <= pickupDetail.rating!.score 
                              ? "fill-primary-500 text-primary-500" 
                              : "fill-transparent text-neutral-300"
                          }`} 
                        />
                      ))}
                    </div>
                    {pickupDetail.rating.comment && (
                      <p className="text-caption text-neutral-600 italic">"{pickupDetail.rating.comment}"</p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-2">
                    <p className="text-caption text-neutral-500 mb-1">Thank you for recycling with WasteWise!</p>
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
