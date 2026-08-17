"use client";

import * as React from "react";
import { PageContainer } from "@/components/PageContainer";
import { getMarketplaceRequests, type BulkMarketplaceRequest } from "@/lib/api/marketplace";
import { MapPin, CheckCircle2, Star, X, Package, Calendar, Tag, Building2, Truck, ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Icon } from "@/components/Icon";
import { RecyclingVerificationGate } from "../RecyclingVerificationGate";
import { Button } from "@/components/Button";

import { MakePaymentModal } from "@/components/MakePaymentModal";

function CollectionHistoryModal({ request, onClose }: { request: BulkMarketplaceRequest; onClose: () => void }) {
  const [showPayment, setShowPayment] = React.useState(false);
  const acceptedQuote = request.quotations?.find((q: any) => q.status === "ACCEPTED");
  
  let wasteTypesArr: any[] = [];
  if (typeof request.wasteTypes === "string") {
    try { wasteTypesArr = JSON.parse(request.wasteTypes); } catch (e) {}
  } else if (Array.isArray(request.wasteTypes)) {
    wasteTypesArr = request.wasteTypes;
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4 backdrop-blur-sm animate-fade-in">
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between p-6 border-b border-neutral-100 bg-neutral-50/50 shrink-0">
            <div>
              <h2 className="text-xl font-bold text-neutral-900">Completed Collection</h2>
              <p className="text-sm text-neutral-500 mt-1">Request ID: {request.id.slice(0, 8)}</p>
            </div>
            <button
              onClick={onClose}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-white border border-neutral-200 text-neutral-500 hover:bg-neutral-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-sm font-semibold rounded-full uppercase tracking-wide flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Business Confirmed &amp; Completed
                </span>
              </div>
                
              {acceptedQuote && acceptedQuote.purchasePrice > 0 ? (
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border ${request.hasPayment ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-200'}`}>
                  <div>
                    <p className="text-xs uppercase tracking-wider font-bold text-neutral-500 mb-1">Payment Status</p>
                    {request.hasPayment ? (
                      <div className="flex items-center gap-2 text-emerald-700 font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-lg">Payment Completed</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-700 font-bold">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-lg">Payment Pending</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {request.hasPayment ? (
                      <>
                        <Button variant="secondary" size="sm" onClick={() => window.open(`/receipt/${request.id}?type=bulk`, '_blank')}>View Receipt</Button>
                        <Button variant="primary" size="sm" onClick={() => window.open(`/receipt/${request.id}?type=bulk&download=true`, '_blank')}>Download Receipt</Button>
                      </>
                    ) : (
                      <Button 
                        variant="primary" 
                        size="md" 
                        className="w-full sm:w-auto shadow-sm"
                        onClick={() => setShowPayment(true)}
                      >
                        Make Payment
                      </Button>
                    )}
                  </div>
                </div>
              ) : null}
            
            <div className="flex items-center gap-4 bg-neutral-50 border border-neutral-100 rounded-xl p-4 mt-2">
              {request.business?.avatarUrl ? (
                <img src={request.business.avatarUrl} alt="Business" className="h-12 w-12 rounded-full object-cover shrink-0" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Icon icon={Building2} />
                </div>
              )}
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Business Name</p>
                <p className="text-lg font-bold text-neutral-900">{request.business?.fullName}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-100 pb-2">
                Collection Info
              </h3>
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <Icon icon={Tag} className="text-emerald-500 shrink-0 mt-0.5" size="sm" />
                  <div>
                    <p className="text-xs text-neutral-500">Accepted Purchase Price</p>
                    <p className="font-semibold text-neutral-900">
                      {acceptedQuote ? `৳${acceptedQuote.purchasePrice.toLocaleString()}` : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Icon icon={Calendar} className="text-blue-500 shrink-0 mt-0.5" size="sm" />
                  <div>
                    <p className="text-xs text-neutral-500">Completed Date</p>
                    <p className="font-semibold text-neutral-900">
                      {format(new Date(request.updatedAt), "MMMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Icon icon={MapPin} className="text-rose-500 shrink-0 mt-0.5" size="sm" />
                  <div>
                    <p className="text-xs text-neutral-500">Pickup Address</p>
                    <p className="font-semibold text-neutral-900">{request.pickupAddress}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-100 pb-2">
                Verified Materials
              </h3>
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <Icon icon={Package} className="text-purple-500 shrink-0 mt-0.5" size="sm" />
                  <div className="w-full">
                    <p className="text-xs text-neutral-500 mb-2">Individual Verified Weights</p>
                    <div className="flex flex-col gap-2">
                      {wasteTypesArr.map((m, i) => (
                        <div key={i} className="flex justify-between items-center bg-neutral-50 px-3 py-2 rounded-lg border border-neutral-100">
                          <span className="text-sm font-medium text-neutral-700">{m.category}</span>
                          <span className="text-sm font-bold text-neutral-900">
                            {request.verifiedWeights?.[m.category] || m.weightKg} kg
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 pt-2 border-t border-neutral-100">
                  <Icon icon={Truck} className="text-amber-500 shrink-0 mt-0.5" size="sm" />
                  <div>
                    <p className="text-xs text-neutral-500">Total Verified Weight</p>
                    <p className="font-bold text-neutral-900 text-lg">
                      {request.verifiedTotalWeightKg || request.estimatedWeightKg} kg
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {request.collectionPhotos && request.collectionPhotos.length > 0 && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-100 pb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-neutral-400" />
                Collection Photos
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {request.collectionPhotos.map((url, i) => (
                  <img key={i} src={url} alt={`Collection Photo ${i+1}`} className="w-full h-24 sm:h-32 object-cover rounded-lg border border-neutral-200" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
      
      {showPayment && acceptedQuote && (
        <MakePaymentModal 
          bulkRequestId={request.id} 
          amount={acceptedQuote.purchasePrice} 
          onClose={() => setShowPayment(false)} 
          onSuccess={() => {
            setShowPayment(false);
            onClose(); // Close both modals
          }} 
        />
      )}
    </>
  );
}

export default function CollectionHistoryPage() {
  const [requests, setRequests] = React.useState<BulkMarketplaceRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = React.useState<BulkMarketplaceRequest | null>(null);

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

        <RecyclingVerificationGate pendingMessage="Your recycling company account needs to be verified by an admin before you can view collection history. Check back once your profile has been approved.">

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
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">
                        COMPLETED
                      </span>
                      <span className="text-xs font-data text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                        #{req.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    {req.rating && (
                      <div className="flex items-center gap-1 text-warning-500">
                        <Icon icon={Star} size="sm" className="fill-current" />
                        <span className="text-sm font-semibold">{req.rating.score}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-h5 text-neutral-900">{req.business?.fullName}</h3>
                    <p className="text-caption text-neutral-400 mt-1">
                      Completed: {format(new Date(req.updatedAt), "MMM d, yyyy")}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 text-body-sm text-neutral-600">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-neutral-400 flex-shrink-0" />
                      <span className="line-clamp-1">{req.pickupAddress}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-neutral-400 flex-shrink-0" />
                      <span className="line-clamp-1">{wasteTypesArr.map(w => w.category).join(", ")}</span>
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
                      <p className="text-caption text-neutral-500">Accepted Price</p>
                      <p className="text-body font-bold text-primary-600 truncate">
                        {acceptedQuote ? `৳${acceptedQuote.purchasePrice.toLocaleString()}` : "N/A"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Button variant="secondary" className="w-full" onClick={() => setSelectedRequest(req)}>
                      View Details
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </RecyclingVerificationGate>
        
        {selectedRequest && (
          <CollectionHistoryModal 
            request={selectedRequest} 
            onClose={() => setSelectedRequest(null)} 
          />
        )}
      </div>
    </PageContainer>
  );
}
