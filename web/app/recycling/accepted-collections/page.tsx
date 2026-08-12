"use client";

import * as React from "react";
import { PageContainer } from "@/components/PageContainer";
import { getMarketplaceRequests, type BulkMarketplaceRequest } from "@/lib/api/marketplace";
import { Truck, MapPin, Clock, Package } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/Button";
import Link from "next/link";
import { ErrorBanner } from "@/components/ErrorBanner";
import { RecyclingVerificationGate } from "../RecyclingVerificationGate";

export default function AcceptedCollectionsPage() {
  const [requests, setRequests] = React.useState<BulkMarketplaceRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    getMarketplaceRequests()
      .then((data) => {
        if (!cancelled) {
          setRequests(data.filter(r => !["OPEN_FOR_BIDDING", "COMPLETED", "CANCELLED"].includes(r.status)));
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMsg(err.message || "Failed to load requests");
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
          <h1 className="text-h2 text-neutral-900">Accepted Collections</h1>
          <p className="text-body text-neutral-500 mt-1">
            Manage and track your active bulk marketplace collections.
          </p>
        </div>

        {errorMsg && <ErrorBanner>{errorMsg}</ErrorBanner>}

        <RecyclingVerificationGate pendingMessage="Your recycling company account needs to be verified by an admin before you can manage collections. Check back once your profile has been approved.">
        {isLoading ? (
          <p className="text-neutral-500">Loading...</p>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-0 p-8 text-center">
            <Truck className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-h4 text-neutral-900">No active collections</h3>
            <p className="mt-2 text-body text-neutral-500 mb-6">
              You don't have any accepted collections in progress.
            </p>
            <Link href="/recycling/marketplace">
              <Button>Browse Marketplace</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((req) => {
              const acceptedQuote = req.quotations?.find((q: any) => q.status === "ACCEPTED");
              const displayStatus = req.status.replace(/_/g, " ");
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
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                        {displayStatus}
                      </span>
                      <p className="text-caption text-neutral-400 mt-2">ID: {req.id.slice(0, 8)}</p>
                    </div>
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
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-neutral-400 flex-shrink-0" />
                      <span>{req.estimatedWeightKg} kg est.</span>
                    </div>
                    {acceptedQuote && (
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-neutral-400 flex-shrink-0" />
                        <span>{format(new Date(acceptedQuote.estimatedPickupDate), "MMM d, yyyy")}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-4 border-t border-neutral-100 flex items-center justify-between">
                    <div>
                      <p className="text-caption text-neutral-500">Purchase Price</p>
                      <p className="text-body font-bold text-primary-600">
                        ?{acceptedQuote?.purchasePrice.toLocaleString() || "N/A"}
                      </p>
                    </div>
                    <Link href={`/recycling/accepted-collections/${req.id}`}>
                      <Button variant="secondary" size="sm">Manage</Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </RecyclingVerificationGate>
      </div>
    </PageContainer>
  );
}
