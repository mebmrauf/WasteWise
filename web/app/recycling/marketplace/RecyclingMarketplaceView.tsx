"use client";

import * as React from "react";
import { getMarketplaceRequests, submitQuotation, type BulkMarketplaceRequest } from "@/lib/api/marketplace";
import { Package, MapPin, Calendar, Clock, ChevronRight, X, Loader2 } from "lucide-react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { ErrorBanner } from "@/components/ErrorBanner";
import { ImageLightbox } from "@/components/ImageLightbox";
import { format } from "date-fns";

export function RecyclingMarketplaceView() {
  const [requests, setRequests] = React.useState<BulkMarketplaceRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedRequest, setSelectedRequest] = React.useState<BulkMarketplaceRequest | null>(null);

  const fetchRequests = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMarketplaceRequests();
      // Filter for OPEN_FOR_BIDDING only
      setRequests(data.filter((req) => req.status === "OPEN_FOR_BIDDING"));
    } catch (error) {
      console.error("Failed to load requests:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-neutral-0 p-8 text-center mt-6">
        <h3 className="text-h4 text-neutral-900">No open requests right now</h3>
        <p className="mt-2 text-body text-neutral-500">
          Check back later for new bulk waste requests in your area.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {requests.map((req) => {
        let wasteTypesArr: any[] = [];
        if (typeof req.wasteTypes === "string") {
          try { wasteTypesArr = JSON.parse(req.wasteTypes); } catch (e) {}
        } else if (Array.isArray(req.wasteTypes)) {
          wasteTypesArr = req.wasteTypes;
        }

        return (
          <div key={req.id} className="rounded-2xl border border-neutral-200 bg-neutral-0 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-emerald-200 transition-colors">
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
                <div className="bg-neutral-50 px-3 py-2 rounded-lg border border-neutral-100">
                  <span className="text-neutral-500 block text-xs mb-1">Total Weight</span>
                  <span className="font-semibold text-neutral-900">{req.estimatedWeightKg} kg</span>
                </div>
                <div className="bg-neutral-50 px-3 py-2 rounded-lg border border-neutral-100">
                  <span className="text-neutral-500 block text-xs mb-1">Preferred Date</span>
                  <span className="font-semibold text-neutral-900 flex items-center gap-1">
                    <Icon icon={Calendar} size="sm" className="w-3 h-3" />
                    {format(new Date(req.preferredPickupDate), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="bg-neutral-50 px-3 py-2 rounded-lg border border-neutral-100">
                  <span className="text-neutral-500 block text-xs mb-1">Waste Types</span>
                  <span className="font-semibold text-neutral-900">
                    {wasteTypesArr.map(w => w.category).join(", ")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 min-w-[200px]">
              <div className="text-right mb-2">
                <span className="text-body-sm text-neutral-500">{req._count?.quotations || 0} quotes so far</span>
              </div>
              {req.quotations && req.quotations.length > 0 ? (
                req.quotations[0].status === "ACCEPTED" ? (
                  <Button disabled variant="secondary" className="w-full bg-emerald-100 text-emerald-800 border-emerald-200">
                    Quotation Accepted
                  </Button>
                ) : req.quotations[0].status === "REJECTED" ? (
                  <Button disabled variant="secondary" className="w-full bg-red-100 text-red-800 border-red-200">
                    Quotation Rejected
                  </Button>
                ) : (
                  <Button disabled variant="secondary" className="w-full">
                    Quotation Submitted
                  </Button>
                )
              ) : (
                <Button onClick={() => setSelectedRequest(req)} className="w-full justify-between group">
                  Submit Quotation
                  <Icon icon={ChevronRight} size="sm" className="opacity-70 group-hover:opacity-100 transition-opacity" />
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {selectedRequest && (
        <SubmitQuotationModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onSuccess={() => {
            setSelectedRequest(null);
            fetchRequests();
          }}
        />
      )}
    </div>
  );
}

function SubmitQuotationModal({ request, onClose, onSuccess }: { request: BulkMarketplaceRequest; onClose: () => void; onSuccess: () => void }) {
  const materials: { category: string; weightKg: number }[] = React.useMemo(() => {
    if (typeof request.wasteTypes === 'string') {
      try { return JSON.parse(request.wasteTypes); } catch (e) { return []; }
    }
    return (request.wasteTypes as any) || [];
  }, [request.wasteTypes]);

  const [prices, setPrices] = React.useState<Record<string, number>>({});
  
  const grandTotal = React.useMemo(() => {
    return materials.reduce((sum, mat) => {
      const pricePerKg = prices[mat.category] || 0;
      return sum + (mat.weightKg * pricePerKg);
    }, 0);
  }, [materials, prices]);

  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("");
  const [vehicle, setVehicle] = React.useState("PICKUP_TRUCK");
  const [notes, setNotes] = React.useState("");
  
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg(null);
      await submitQuotation(request.id, {
        purchasePrice: grandTotal,
        pricesPerKg: prices,
        vehicleType: vehicle,
        estimatedPickupDate: new Date(date).toISOString(),
        estimatedPickupTime: time || undefined,
        additionalNotes: notes || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit quotation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl border border-neutral-200">
        <div className="sticky top-0 bg-white border-b border-neutral-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-h4 text-neutral-900">Submit Quotation</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-50 text-neutral-500 hover:bg-neutral-100 transition-colors"
          >
            <Icon icon={X} size="sm" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && <ErrorBanner>{errorMsg}</ErrorBanner>}

          <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
            <h4 className="font-medium text-neutral-900 mb-2">Request Details</h4>
            <div className="grid grid-cols-2 gap-4 text-body-sm">
              <div>
                <span className="text-neutral-500 block text-xs">Business</span>
                <span className="text-neutral-900">{request.business?.fullName}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-xs">Total Weight</span>
                <span className="text-neutral-900">{request.estimatedWeightKg} kg</span>
              </div>
            </div>
          </div>

<<<<<<< Updated upstream
          <div>
            <label className="block text-body-sm font-medium text-neutral-700 mb-2">
              Purchase Price (BDT)
            </label>
            <input
              type="number"
              required
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="e.g. 5000"
            />
=======
          {request.images && request.images.length > 0 && (
            <div>
              <h4 className="font-medium text-neutral-900 mb-3">Photos</h4>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {request.images.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Waste photo ${idx + 1}`}
                    className="h-24 w-24 shrink-0 rounded-lg object-cover border border-neutral-200 cursor-pointer"
                    onClick={() => setPreviewImageUrl(url)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="font-medium text-neutral-900">Price Breakdown</h4>
            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-2 font-medium">Material</th>
                    <th className="px-4 py-2 font-medium">Weight</th>
                    <th className="px-4 py-2 font-medium">Price/kg (BDT)</th>
                    <th className="px-4 py-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {materials.map((mat, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 capitalize">{mat.category.toLowerCase()}</td>
                      <td className="px-4 py-3 text-neutral-600">{mat.weightKg} kg</td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={prices[mat.category] === undefined ? "" : prices[mat.category]}
                          onChange={(e) => setPrices(p => ({ ...p, [mat.category]: Number(e.target.value) }))}
                          className="w-24 rounded border border-neutral-300 px-2 py-1 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          placeholder="e.g. 50"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ৳{((prices[mat.category] || 0) * mat.weightKg).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-neutral-50 border-t border-neutral-200">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right font-medium text-neutral-600">Grand Total:</td>
                    <td className="px-4 py-3 text-right text-lg font-bold text-emerald-600">
                      ৳{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
>>>>>>> Stashed changes
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-body-sm font-medium text-neutral-700 mb-2">
                Pickup Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-body-sm font-medium text-neutral-700 mb-2">
                Time (Optional)
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-body-sm font-medium text-neutral-700 mb-2">
              Vehicle Type
            </label>
            <select
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="PICKUP_TRUCK">Pickup Truck</option>
              <option value="TRUCK">Truck</option>
              <option value="MOTORCYCLE_VAN">Motorcycle Van</option>
              <option value="BICYCLE_VAN">Bicycle Van</option>
              <option value="HANDCART">Handcart</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-body-sm font-medium text-neutral-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific conditions or information for the business..."
              className="w-full rounded-lg border border-neutral-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Submit Quotation"}
            </Button>
          </div>
        </form>
      </div>

      {previewImageUrl && (
        <ImageLightbox src={previewImageUrl} alt="Waste photo preview" onClose={() => setPreviewImageUrl(null)} />
      )}
    </div>
  );
}
