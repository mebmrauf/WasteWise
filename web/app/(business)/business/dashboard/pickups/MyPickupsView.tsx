"use client";

import * as React from "react";
import { ClipboardList, Package, Calendar, MapPin, Truck, Search, ChevronDown, ChevronUp, Building2, Tag, Star } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { WasteCategoryChip } from "@/components/WasteCategoryChip";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Icon } from "@/components/Icon";
import { InlineConfirm } from "@/components/InlineConfirm";
import { PageContainer } from "@/components/PageContainer";
import { CollectorRatingModal } from "@/components/CollectorRatingModal";
import { formatDate } from "@/components/AvailableJobListItem";
import { StatusTimeline } from "@/components/StatusTimeline";
import { ReceiptModal } from "@/components/ReceiptModal";
import { CompanyRatingModal } from "@/components/CompanyRatingModal";
import { CsrContributionModal } from "@/components/CsrContributionModal";
import { createCsrContribution } from "@/lib/api/csr";
import { StatusPill } from "@/components/StatusPill";
import { PickupOffersPanel } from "@/components/PickupOffersPanel";
import { TrackPickupPanel } from "@/components/TrackPickupPanel";
import {
  getTrackingSocket,
  PICKUP_JOIN_EVENT,
  PICKUP_STATUS_EVENT,
  type PickupStatusPayload,
} from "@/lib/socket";
import { AuthApiError } from "@/lib/api/auth";
import {
  cancelPickupRequest,
  listPickups,
  formatEstimatedWeightRange,
  type PickupRequestSummary,
} from "@/lib/api/pickups";
import { PICKUP_STATUS_TONE, PICKUP_STATUS_LABEL } from "@/lib/pickupStatus";
import { getMarketplaceRequests, type BulkMarketplaceRequest } from "@/lib/api/marketplace";
import { BulkPickupDetailsModal } from "@/components/BulkPickupDetailsModal";
import { cn } from "@/lib/utils";

const cancelPickupErrorMessages: Record<string, string> = {
  INVALID_STATUS_TRANSITION:
    "This pickup can no longer be cancelled — its status changed (e.g. a collector may have already accepted it). The list below has been refreshed.",
  FORBIDDEN: "You're not able to cancel this pickup.",
  NOT_FOUND: "This pickup no longer exists. The list below has been refreshed.",
};

function resolveCancelPickupErrorMessage(err: unknown): string {
  if (err instanceof AuthApiError) {
    return cancelPickupErrorMessages[err.code] ?? "Couldn't cancel this pickup. Try again.";
  }
  return "Couldn't cancel this pickup. Try again.";
}

function formatPickupWindow(pickupDate: string): string {
  const start = new Date(pickupDate);
  const dateStr = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return `${dateStr}`;
}

type LoadState = "loading" | "ready" | "error";


export function MyPickupsView() {
  const [loadState, setLoadState] = React.useState<LoadState>("loading");
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [pickups, setPickups] = React.useState<BulkMarketplaceRequest[]>([]);
  const [bulkDetailsPickup, setBulkDetailsPickup] = React.useState<BulkMarketplaceRequest | null>(null);
  const [csrModalPickup, setCsrModalPickup] = React.useState<BulkMarketplaceRequest | null>(null);

  // Filtering states
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");

  const [companyRatingModalPickupId, setCompanyRatingModalPickupId] = React.useState<string | null>(null);

  const fetchPickups = React.useCallback((silent: boolean = false) => {
    if (!silent) {
      setLoadState("loading");
      setLoadError(null);
    }
    return getMarketplaceRequests()
      .then((bulkData) => {
        const bulkPickups = bulkData.filter(b => b.assignedCompanyId !== null);
        setPickups(bulkPickups);
        if (!silent) {
          setLoadState("ready");
        }
      })
      .catch(() => {
        if (!silent) {
          setLoadError("Something went wrong loading your pickups. Try refreshing the page.");
          setLoadState("error");
        }
      });
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await fetchPickups();
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPickups]);

  // Keep bulkDetailsPickup synced if data refreshes
  React.useEffect(() => {
    if (bulkDetailsPickup) {
      const updated = pickups.find(p => p.id === bulkDetailsPickup.id);
      if (updated && updated !== bulkDetailsPickup) {
        setBulkDetailsPickup(updated as BulkMarketplaceRequest);
      }
    }
  }, [pickups, bulkDetailsPickup]);



  // Derived filtered pickups
  const filteredPickups = React.useMemo(() => {
    const sorted = [...pickups].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sorted.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesId = p.id.toLowerCase().includes(query);
        const matchesAddress = (p.pickupAddress || "").toLowerCase().includes(query);
        
        let matchesMaterial = false;
        try {
          const types = typeof p.wasteTypes === 'string' ? JSON.parse(p.wasteTypes) : p.wasteTypes;
          matchesMaterial = types.some((w: any) => w.category.toLowerCase().includes(query));
        } catch (e) {}
        
        const matchesStatus = p.status.replace(/_/g, " ").toLowerCase().includes(query);
        
        if (!matchesId && !matchesAddress && !matchesMaterial && !matchesStatus) return false;
      }
      return true;
    });
  }, [pickups, statusFilter, searchQuery]);

  // Statistics
  const totalRequests = pickups.length;
  const completedCount = pickups.filter(p => p.status === "COMPLETED").length;
  const pendingCount = pickups.filter(p => p.status === "OPEN_FOR_BIDDING" || p.status === "BIDDING_CLOSED").length;

  const renderCard = (pickup: BulkMarketplaceRequest) => {
      const displayStatus = pickup.status.replace(/_/g, " ");
      const acceptedQuote = pickup.quotations?.find((q: any) => q.status === "ACCEPTED");
      let materials: any[] = [];
      try {
        materials = typeof pickup.wasteTypes === 'string' ? JSON.parse(pickup.wasteTypes) : pickup.wasteTypes;
      } catch(e) {}
      
      return (
        <Card key={pickup.id} className="relative flex flex-col border border-neutral-100 shadow-sm transition-shadow hover:shadow-md overflow-hidden rounded-2xl p-0 bg-white">
          <div className="p-5 sm:p-6 flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0 bg-blue-50 text-blue-600">
                  <Icon icon={Package} size="md" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-neutral-900 leading-tight truncate">
                      Bulk Waste Pickup
                    </h3>
                    <span className="text-xs font-data text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">#{pickup.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <p className="text-sm font-medium text-neutral-500 mt-0.5">
                    {new Date(pickup.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm bg-blue-100 text-blue-800 tracking-wide uppercase">
                  {displayStatus}
                </span>
                <Button variant="secondary" size="sm" onClick={() => setBulkDetailsPickup(pickup)}>
                  View Details
                </Button>
                {pickup.status === "COMPLETED" && (
                  (pickup as any).rating ? (
                    <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-full text-sm font-medium border border-yellow-200">
                      <Icon icon={Star} size="sm" className="fill-current w-4 h-4" />
                      <span>{(pickup as any).rating.score}</span>
                    </div>
                  ) : (
                    <Button className="bg-yellow-500 hover:bg-yellow-600 text-white border-transparent" size="sm" onClick={() => setCompanyRatingModalPickupId(pickup.id)}>
                      Rate Company
                    </Button>
                  )
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-3 bg-neutral-50/50 border border-neutral-100 rounded-xl p-4">
                <p className="text-caption text-neutral-500 uppercase tracking-wider">Materials & Est. Weight</p>
                <div className="flex flex-wrap gap-2">
                  {materials.map((item, i) => (
                    <div key={i} className="flex flex-col gap-1 items-start bg-white border border-neutral-100 p-2 rounded-lg shadow-sm">
                      <WasteCategoryChip category={item.category} />
                      <span className="text-caption text-neutral-500 font-medium px-1">
                        {item.weightKg} kg
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex-1 flex items-center gap-4 bg-neutral-50/50 border border-neutral-100 rounded-xl p-4">
                  <Icon icon={Building2} size="sm" className="text-blue-600 shrink-0" />
                  <div>
                    <p className="text-caption text-neutral-500 mb-0.5">Assigned Recycling Company</p>
                    <p className="text-body-sm font-semibold text-neutral-900">{pickup.assignedCompany?.fullName || "N/A"}</p>
                  </div>
                </div>
                <div className="flex-1 flex items-center gap-4 bg-neutral-50/50 border border-neutral-100 rounded-xl p-4">
                  <Icon icon={Tag} size="sm" className="text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-caption text-neutral-500 mb-0.5">Accepted Price</p>
                    <p className="text-body-sm font-semibold text-emerald-600 truncate">
                      {acceptedQuote ? `৳${acceptedQuote.purchasePrice.toLocaleString()}` : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      );
  };

  return (
    <PageContainer className="py-8 lg:py-12 max-w-6xl">
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-emerald-100 p-8 mb-8 rounded-2xl shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Pickup History</h1>
        <p className="mt-2 text-neutral-600">
          View and track all your recycling pickup requests in one place.
        </p>
      </Card>

      {loadState === "loading" && (
        <Card className="mt-8 text-center p-12">
          <p className="text-body-sm text-neutral-500">Loading your pickups…</p>
        </Card>
      )}

      {loadState === "error" && <ErrorBanner className="mt-8">{loadError}</ErrorBanner>}

      {loadState === "ready" && pickups.length === 0 && (
        <Card className="flex flex-col items-center justify-center p-12 text-center bg-neutral-50 border border-dashed border-neutral-300 shadow-none min-h-[300px] mt-8">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
            <Icon icon={ClipboardList} size="lg" aria-hidden />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 mb-2">No pickups yet</h3>
            <p className="text-sm text-neutral-500 max-w-sm mx-auto">
              Once you request a pickup, it'll show up here with live tracking and verified weights.
            </p>
          </div>
          <Button href="/business/dashboard/pickups/new" className="mt-6 px-8 bg-emerald-600 hover:bg-emerald-700 text-white">Request your first pickup</Button>
        </Card>
      )}

      {loadState === "ready" && pickups.length > 0 && (
        <div className="mt-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <Card className="p-4 bg-white border border-neutral-100 shadow-sm text-center">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Total</p>
              <p className="text-3xl font-black text-neutral-900 mt-2">{totalRequests}</p>
            </Card>
            <Card className="p-4 bg-white border border-neutral-100 shadow-sm text-center">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Completed</p>
              <p className="text-3xl font-black text-neutral-900 mt-2">{completedCount}</p>
            </Card>
            <Card className="p-4 bg-white border border-neutral-100 shadow-sm text-center">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Pending</p>
              <p className="text-3xl font-black text-neutral-900 mt-2">{pendingCount}</p>
            </Card>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full xl:w-auto shrink-0">
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-white border border-neutral-200 text-sm font-medium rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-[200px] shrink-0"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN_FOR_BIDDING">Bidding Open</option>
                <option value="BIDDING_CLOSED">Bidding Closed</option>
                <option value="RECYCLING_COMPANY_ASSIGNED">Company Assigned</option>
                <option value="EN_ROUTE">En Route</option>
                <option value="ARRIVED">Arrived</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="VERIFYING_WEIGHTS">Verifying Weights</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <div className="relative w-full sm:w-[360px] shrink-0">
                <Icon icon={Search} size="sm" className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input 
                  type="text" 
                  placeholder="Search material, ID, location..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-white border border-neutral-200 text-sm font-medium rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                />
              </div>
            </div>
          </div>

          {/* List */}
          {filteredPickups.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center bg-neutral-50 border border-dashed border-neutral-300 shadow-none min-h-[200px]">
              <Icon icon={Search} size="lg" className="text-neutral-400 mb-4" />
              <h3 className="text-lg font-bold text-neutral-900 mb-1">No matches found</h3>
              <p className="text-sm text-neutral-500">
                Try adjusting your filters or search query.
              </p>
            </Card>
          ) : (
            <div className="flex flex-col gap-6">
              {filteredPickups.map(renderCard)}
            </div>
          )}
        </div>
      )}

      {companyRatingModalPickupId && (
        <CompanyRatingModal
          pickupId={companyRatingModalPickupId}
          companyName={(pickups.find(p => p.id === companyRatingModalPickupId && 'wasteTypes' in p) as any)?.assignedCompany?.fullName}
          onClose={() => setCompanyRatingModalPickupId(null)}
          onSuccess={() => {
            setCompanyRatingModalPickupId(null);
            void fetchPickups();
          }}
        />
      )}

      {bulkDetailsPickup && (
        <BulkPickupDetailsModal
          request={bulkDetailsPickup}
          onClose={() => setBulkDetailsPickup(null)}
          onUpdate={() => {
            fetchPickups(true).then(() => {
               // Update bulkDetailsPickup with fresh data if possible
               // We rely on the fetchPickups completion to update the parent state
            });
          }}
          onCsrTrigger={(req) => setCsrModalPickup(req)}
        />
      )}

      {csrModalPickup && (
        <CsrContributionModal
          isOpen={!!csrModalPickup}
          onClose={() => {
            setCsrModalPickup(null);
            void fetchPickups(true);
          }}
          paymentAmount={csrModalPickup.quotations?.find(q => q.status === "ACCEPTED")?.purchasePrice || 0}
          onConfirm={async (amount, percentage, cause) => {
            await createCsrContribution({
              pickupId: csrModalPickup.id,
              donationAmount: amount,
              donationPercentage: percentage,
              selectedCause: cause,
              paymentAmount: csrModalPickup.quotations?.find(q => q.status === "ACCEPTED")?.purchasePrice || 0,
            });
          }}
        />
      )}
    </PageContainer>
  );
}
