"use client";

import * as React from "react";
import { getMarketplaceRequest, updateBulkRequestStatus, submitBulkCollectionProof, type BulkMarketplaceRequest } from "@/lib/api/marketplace";
import { Package, MapPin, Loader2, Truck, UploadCloud, CheckCircle2, Navigation, X, Tag, Calendar, Building2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChatWidget } from "@/components/ChatWidget";

export function CollectionWorkflowView({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [request, setRequest] = React.useState<BulkMarketplaceRequest | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Proof form state
  const [weights, setWeights] = React.useState<Record<string, number>>({});
  const [notes, setNotes] = React.useState("");

  const fetchRequest = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMarketplaceRequest(requestId);
      setRequest(data);
      
      // Init weights
      if (data.wasteTypes) {
        let wasteTypesArr: any[] = [];
        if (typeof data.wasteTypes === "string") {
          try { wasteTypesArr = JSON.parse(data.wasteTypes); } catch (e) {}
        } else if (Array.isArray(data.wasteTypes)) {
          wasteTypesArr = data.wasteTypes;
        }
        
        const initWeights: Record<string, number> = {};
        wasteTypesArr.forEach(w => {
          initWeights[w.category] = w.weightKg || 0;
        });
        setWeights(initWeights);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load request.");
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  React.useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  const handleStatusUpdate = async (status: string) => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await updateBulkRequestStatus(requestId, status);
      await fetchRequest();
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to update status to ${status}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWeightChange = (category: string, value: string) => {
    setWeights(prev => ({
      ...prev,
      [category]: Number(value)
    }));
  };



  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    
    
    const totalWeight = Object.values(weights).reduce((sum, val) => sum + (Number(val) || 0), 0);
    
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await submitBulkCollectionProof(requestId, {
        verifiedWeights: weights,
        verifiedTotalWeightKg: totalWeight,
        notes: notes || undefined,
      });
      await fetchRequest();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit collection proof.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="mt-6 space-y-6 max-w-3xl">
        <ErrorBanner>{errorMsg}</ErrorBanner>
      </div>
    );
  }

  if (!request) {
    return <div className="text-center p-8 text-neutral-500">Request not found.</div>;
  }

  const status = request.status;
  
  if (status === "COMPLETED") {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-neutral-0 p-8 text-center mt-6">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
        <h3 className="text-h4 text-neutral-900">Collection Completed</h3>
        <p className="mt-2 text-body text-neutral-500 mb-6">
          The business has confirmed the collection.
        </p>
        <Button onClick={() => router.push("/recycling/collection-history")}>View Collection History</Button>
      </div>
    );
  }

  const totalVerifiedWeight = Object.values(weights).reduce((sum, val) => sum + (Number(val) || 0), 0);
  
  const acceptedQuote = request.quotations?.find((q) => q.status === "ACCEPTED");
  let materials: { category: string; weightKg: number }[] = [];
  try {
    if (typeof request.wasteTypes === "string") {
      materials = JSON.parse(request.wasteTypes);
    } else if (Array.isArray(request.wasteTypes)) {
      materials = request.wasteTypes as any;
    }
  } catch (e) {}

  return (
    <div className="mt-6 space-y-6 max-w-3xl">
      <div className="rounded-2xl border border-neutral-200 bg-neutral-0 p-6 shadow-sm flex flex-col gap-6">
        <h2 className="text-h4 text-neutral-900 border-b border-neutral-100 pb-4">Collection Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-1">Business</p>
              <div className="flex items-center gap-2">
                <Icon icon={Building2} className="text-blue-500" size="sm" />
                <span className="font-semibold text-neutral-900">{request.business?.fullName || "N/A"}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-1">Pickup Address</p>
              <div className="flex items-start gap-2">
                <Icon icon={MapPin} className="text-rose-500 shrink-0 mt-0.5" size="sm" />
                <span className="font-medium text-neutral-900">{request.pickupAddress}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-1">Pickup Schedule</p>
              <div className="flex items-start gap-2">
                <Icon icon={Calendar} className="text-blue-500 shrink-0 mt-0.5" size="sm" />
                <span className="font-medium text-neutral-900">
                  {acceptedQuote ? format(new Date(acceptedQuote.estimatedPickupDate), "MMM d, yyyy") : "N/A"}
                  {acceptedQuote?.estimatedPickupTime ? ` at ${acceptedQuote.estimatedPickupTime}` : ""}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-1">Accepted Quotation Price</p>
              <div className="flex items-center gap-2">
                <Icon icon={Tag} className="text-emerald-500" size="sm" />
                <span className="font-semibold text-neutral-900">
                  {acceptedQuote ? `৳${acceptedQuote.purchasePrice.toLocaleString()}` : "N/A"}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-1">Materials & Weight</p>
              <div className="flex flex-wrap gap-2 mt-1 mb-2">
                {materials.map((m, i) => (
                  <span key={i} className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs font-medium rounded">
                    {m.category} ({m.weightKg}kg)
                  </span>
                ))}
              </div>
              <p className="text-sm text-neutral-600">Total Estimated: <span className="font-semibold text-neutral-900">{request.estimatedWeightKg} kg</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-neutral-0 p-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-h5 text-neutral-900">Collection Status</h3>
            <p className="text-body-sm text-neutral-500 font-medium">
              {status.replace(/_/g, " ")}
            </p>
          </div>
        </div>
        
        {status === "RECYCLING_COMPANY_ASSIGNED" && (
          <Button onClick={() => handleStatusUpdate("IN_PROGRESS")} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Package className="w-4 h-4 mr-2" />}
            Start Collection
          </Button>
        )}
        {status === "VERIFYING_WEIGHTS" && (
          <div className="px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium border border-amber-200">
            Awaiting Business Confirmation
          </div>
        )}
      </div>

      {errorMsg && <ErrorBanner>{errorMsg}</ErrorBanner>}

      {status === "IN_PROGRESS" && (
        <form onSubmit={handleSubmitProof} className="rounded-2xl border border-neutral-200 bg-neutral-0 p-6 shadow-sm">
          <h3 className="text-h4 text-neutral-900 mb-2">Submit Collection Proof</h3>
          <p className="text-body-sm text-neutral-500 mb-6">
            Upload photos of the collected waste and enter the exact verified weights for each material.
          </p>

          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-neutral-900 mb-3">Verified Weights (kg)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.keys(weights).map((category) => (
                  <div key={category} className="flex flex-col gap-1.5">
                    <label className="text-body-sm text-neutral-600 capitalize">
                      {category.toLowerCase()}
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.1"
                      value={weights[category] === 0 ? "" : weights[category]}
                      onChange={(e) => handleWeightChange(category, e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-neutral-100 flex justify-between items-center text-body font-bold text-neutral-900">
                <span>Total Verified Weight</span>
                <span>{totalVerifiedWeight} kg</span>
              </div>
            </div>



            <div>
              <h4 className="font-medium text-neutral-900 mb-3">Notes (Optional)</h4>
              <textarea
                rows={3}
                placeholder="Any additional information about the collection..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-body-sm"
              />
            </div>
            
            <div className="pt-2">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Confirm"}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Request Details */}
      <div className="rounded-2xl border border-neutral-200 bg-neutral-0 p-6 shadow-sm">
        <h4 className="font-medium text-neutral-900 mb-4">Request Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
          <div>
            <p className="text-caption text-neutral-500">Business</p>
            <p className="text-body text-neutral-900">{request.business?.fullName}</p>
          </div>
          <div>
            <p className="text-caption text-neutral-500">Pickup Address</p>
            <p className="text-body text-neutral-900">{request.pickupAddress}</p>
          </div>
          <div>
            <p className="text-caption text-neutral-500">Estimated Total Weight</p>
            <p className="text-body text-neutral-900">{request.estimatedWeightKg} kg</p>
          </div>
        </div>
      </div>
      
      {request.businessId && (
        <ChatWidget
          targetUserId={request.businessId}
          targetUserName={request.business?.fullName || "Business"}
          isActive={status !== "CANCELLED"}
        />
      )}
    </div>
  );
}
