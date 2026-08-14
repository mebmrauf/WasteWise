"use client";

import * as React from "react";
import { format } from "date-fns";
import { X, Calendar, Truck, Package, Tag, Building2, MapPin, Loader2, CheckCircle2, Star } from "lucide-react";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { confirmBulkCollection, type BulkMarketplaceRequest } from "@/lib/api/marketplace";
import { CompanyRatingModal } from "./CompanyRatingModal";

interface BulkPickupDetailsModalProps {
  request: BulkMarketplaceRequest;
  onClose: () => void;
  onUpdate?: () => void;
}

export function BulkPickupDetailsModal({ request, onClose, onUpdate }: BulkPickupDetailsModalProps) {
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = React.useState(false);
  const [localRating, setLocalRating] = React.useState<{ score: number; comment?: string | null } | null>(request.rating || null);

  React.useEffect(() => {
    if (request.rating && !localRating) {
      setLocalRating(request.rating);
    }
  }, [request.rating, localRating]);

  const handleConfirm = async () => {
    try {
      setIsConfirming(true);
      setErrorMsg(null);
      await confirmBulkCollection(request.id);
      
      setShowRatingModal(true);
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to confirm collection.");
    } finally {
      setIsConfirming(false);
    }
  };
  const acceptedQuote = request.quotations?.find((q) => q.status === "ACCEPTED");

  // Format materials
  let materials: { category: string; weightKg: number }[] = [];
  try {
    if (typeof request.wasteTypes === "string") {
      materials = JSON.parse(request.wasteTypes);
    } else if (Array.isArray(request.wasteTypes)) {
      materials = request.wasteTypes as any;
    }
  } catch (e) {
    console.error("Failed to parse wasteTypes:", e);
  }

  // Format Status
  const displayStatus = request.status.replace(/_/g, " ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-100 bg-neutral-50/50">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Bulk Pickup Details</h2>
            <p className="text-sm text-neutral-500 mt-1">Request ID: {request.id.slice(0, 8)}</p>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-white border border-neutral-200 text-neutral-500 hover:bg-neutral-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex flex-col gap-8">
          
          {/* Status & Assigned Company */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full uppercase tracking-wide">
                {displayStatus}
              </span>
            </div>
            
            {request.assignedCompany && (
              <div className="flex items-center gap-4 bg-neutral-50 border border-neutral-100 rounded-xl p-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Icon icon={Building2} />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Assigned Recycling Company</p>
                  <p className="text-lg font-bold text-neutral-900">{request.assignedCompany.fullName}</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Accepted Quotation Info */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-100 pb-2">
                Accepted Quotation
              </h3>
              {acceptedQuote ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <Icon icon={Tag} className="text-emerald-500 shrink-0 mt-1" size="sm" />
                    <div>
                      <p className="text-xs text-neutral-500">Purchase Price</p>
                      <p className="font-semibold text-neutral-900">৳{acceptedQuote.purchasePrice.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Icon icon={Calendar} className="text-blue-500 shrink-0 mt-1" size="sm" />
                    <div>
                      <p className="text-xs text-neutral-500">Estimated Pickup Date</p>
                      <p className="font-semibold text-neutral-900">
                        {format(new Date(acceptedQuote.estimatedPickupDate), "MMMM d, yyyy")}
                        {acceptedQuote.estimatedPickupTime && ` at ${acceptedQuote.estimatedPickupTime}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Icon icon={Truck} className="text-amber-500 shrink-0 mt-1" size="sm" />
                    <div>
                      <p className="text-xs text-neutral-500">Vehicle Type</p>
                      <p className="font-semibold text-neutral-900 capitalize">{acceptedQuote.vehicleType.replace(/_/g, " ").toLowerCase()}</p>
                    </div>
                  </div>
                  {acceptedQuote.additionalNotes && (
                    <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100 mt-2">
                      <p className="text-xs text-neutral-500 mb-1">Company Notes</p>
                      <p className="text-sm text-neutral-700">{acceptedQuote.additionalNotes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-neutral-500 italic">No quotation accepted yet.</p>
              )}
            </div>

            {/* Request Info */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-100 pb-2">
                Request Details
              </h3>
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <Icon icon={Package} className="text-purple-500 shrink-0 mt-1" size="sm" />
                  <div>
                    <p className="text-xs text-neutral-500">Materials</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {materials.map((m, i) => (
                        <span key={i} className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs font-medium rounded">
                          {m.category} ({m.weightKg}kg)
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 pl-8 border-l-2 border-neutral-100 ml-2 mt-1">
                  <div>
                    <p className="text-xs text-neutral-500">Estimated Total Weight</p>
                    <p className="font-semibold text-neutral-900">{request.estimatedWeightKg} kg</p>
                  </div>
                  {request.verifiedTotalWeightKg && (
                    <div>
                      <p className="text-xs text-neutral-500">Verified Total Weight</p>
                      <p className="font-semibold text-emerald-600">{request.verifiedTotalWeightKg} kg</p>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-3 mt-2">
                  <Icon icon={MapPin} className="text-rose-500 shrink-0 mt-1" size="sm" />
                  <div>
                    <p className="text-xs text-neutral-500">Pickup Address</p>
                    <p className="font-medium text-neutral-900">{request.pickupAddress}</p>
                  </div>
                </div>
                {request.additionalNotes && (
                  <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100 mt-2">
                    <p className="text-xs text-neutral-500 mb-1">Request Notes</p>
                    <p className="text-sm text-neutral-700 whitespace-pre-wrap">{request.additionalNotes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rating Section */}
          {request.status === "COMPLETED" && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-100 pb-2">
                Rating & Feedback
              </h3>
              {localRating ? (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex flex-col gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${star <= localRating.score ? "fill-emerald-500 text-emerald-500" : "fill-neutral-200 text-neutral-200"}`}
                      />
                    ))}
                    <span className="ml-2 text-sm font-medium text-emerald-800">You rated {localRating.score} stars</span>
                  </div>
                  {localRating.comment && (
                    <p className="text-sm text-emerald-700 italic mt-1">"{localRating.comment}"</p>
                  )}
                </div>
              ) : (
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-orange-900">How was the pickup?</p>
                    <p className="text-xs text-orange-700 mt-1">Rate {request.assignedCompany?.fullName} for their service.</p>
                  </div>
                  <Button onClick={() => setShowRatingModal(true)} size="sm" className="bg-orange-500 hover:bg-orange-600 border-orange-500 text-white">
                    Rate Company
                  </Button>
                </div>
              )}
            </div>
          )}

        </div>



        {/* Error Banner */}
        {errorMsg && (
          <div className="px-6 py-3 bg-red-50 text-red-600 text-sm border-t border-red-100">
            {errorMsg}
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-3">
          <Button onClick={onClose} variant="secondary">Close Details</Button>
          {request.status === "VERIFYING_WEIGHTS" && (
            <Button onClick={handleConfirm} disabled={isConfirming} className="bg-emerald-600 hover:bg-emerald-700">
              {isConfirming ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Confirm Collection
            </Button>
          )}
        </div>
      </div>

      {showRatingModal && (
        <CompanyRatingModal
          pickupId={request.id}
          companyName={request.assignedCompany?.fullName}
          onClose={() => setShowRatingModal(false)}
          onSuccess={() => {
            setShowRatingModal(false);
            if (onUpdate) onUpdate();
          }}
        />
      )}
    </div>
  );
}
