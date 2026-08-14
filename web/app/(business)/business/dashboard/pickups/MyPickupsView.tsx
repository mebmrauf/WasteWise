"use client";

import * as React from "react";
import { ClipboardList, Package, Calendar, MapPin, Truck, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { WasteCategoryChip } from "@/components/WasteCategoryChip";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Icon } from "@/components/Icon";
import { InlineConfirm } from "@/components/InlineConfirm";
import { PageContainer } from "@/components/PageContainer";
import { CollectorRatingModal } from "@/components/CollectorRatingModal";
import { ReceiptModal } from "@/components/ReceiptModal";
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
  LOAD_SIZE_LABELS,
  formatKgRange,
  type PickupRequestSummary,
} from "@/lib/api/pickups";
import { PICKUP_STATUS_TONE, PICKUP_STATUS_LABEL } from "@/lib/pickupStatus";
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

function formatPickupWindow(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const dateLabel = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const startTime = start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true });
  const endTime = end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${dateLabel} · ${startTime} - ${endTime}`;
}

type LoadState = "loading" | "ready" | "error";

export function MyPickupsView() {
  const [loadState, setLoadState] = React.useState<LoadState>("loading");
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [pickups, setPickups] = React.useState<PickupRequestSummary[]>([]);

  // Filtering states
  const [typeFilter, setTypeFilter] = React.useState<"ALL" | "SMART" | "BULK">("ALL");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");

  const [cancellingId, setCancellingId] = React.useState<string | null>(null);
  const [cancelErrors, setCancelErrors] = React.useState<Record<string, string>>({});
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);
  const [receiptModalPickupId, setReceiptModalPickupId] = React.useState<string | null>(null);
  const [ratingModalPickupId, setRatingModalPickupId] = React.useState<string | null>(null);
  
  const [expandedPickupId, setExpandedPickupId] = React.useState<string | null>(null);
  const [expandedView, setExpandedView] = React.useState<"offers" | "track" | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const openPickupId = urlParams.get("pickupId");
      const openView = urlParams.get("view");
      
      if (openPickupId && (openView === "offers" || openView === "track")) {
        setExpandedPickupId(openPickupId);
        setExpandedView(openView as "offers" | "track");
        
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const cancelTriggerRefs = React.useRef<Map<string, React.RefObject<HTMLButtonElement | HTMLAnchorElement>>>(new Map());
  function getCancelTriggerRef(pickupId: string) {
    let ref = cancelTriggerRefs.current.get(pickupId);
    if (!ref) {
      ref = React.createRef<HTMLButtonElement | HTMLAnchorElement>();
      cancelTriggerRefs.current.set(pickupId, ref);
    }
    return ref;
  }

  const fetchPickups = React.useCallback((silent: boolean = false) => {
    if (!silent) {
      setLoadState("loading");
      setLoadError(null);
    }
    return listPickups()
      .then(({ pickups: rows }) => {
        setPickups(rows);
        if (!silent) {
          setLoadState("ready");
        }
      })
      .catch((err: unknown) => {
        if (!silent) {
          setLoadError(
            err instanceof AuthApiError
              ? "Couldn't load your pickups. Try refreshing the page."
              : "Something went wrong loading your pickups. Try refreshing the page.",
          );
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

  // Global socket listener
  React.useEffect(() => {
    const socket = getTrackingSocket();

    function handleStatus(payload: PickupStatusPayload) {
      setPickups((prev) => {
        let changed = false;
        const next = prev.map((p) => {
          if (p.id === payload.pickupRequestId && p.status !== payload.status) {
            changed = true;
            return { ...p, status: payload.status };
          }
          return p;
        });

        if (changed && payload.status === "VERIFYING_WEIGHTS") {
          setExpandedPickupId(payload.pickupRequestId);
          setExpandedView("track");
        }
        if (changed && payload.status === "COMPLETED") {
          setRatingModalPickupId(payload.pickupRequestId);
        }
        
        return changed ? next : prev;
      });
    }

    socket.on(PICKUP_STATUS_EVENT, handleStatus);
    return () => {
      socket.off(PICKUP_STATUS_EVENT, handleStatus);
    };
  }, []);

  // Join the tracking room for all active pickups
  React.useEffect(() => {
    const socket = getTrackingSocket();
    const activePickups = pickups.filter((p) => p.status !== "COMPLETED" && p.status !== "CANCELLED");
    
    activePickups.forEach((p) => {
      socket.emit(PICKUP_JOIN_EVENT, { pickupRequestId: p.id });
    });
  }, [pickups]);

  async function handleCancelPickup(pickupId: string) {
    setCancelErrors((prev) => {
      const next = { ...prev };
      delete next[pickupId];
      return next;
    });
    setCancellingId(pickupId);
    try {
      const { pickup: updated } = await cancelPickupRequest(pickupId);
      setPickups((prev) => prev.map((pickup) => (pickup.id === updated.id ? { ...pickup, ...updated } : pickup)));
      setCancellingId(null);
    } catch (err) {
      setCancellingId(null);
      setCancelErrors((prev) => ({ ...prev, [pickupId]: resolveCancelPickupErrorMessage(err) }));
      if (err instanceof AuthApiError && (err.code === "INVALID_STATUS_TRANSITION" || err.code === "NOT_FOUND")) {
        void fetchPickups();
      }
    }
  }

  // Derived filtered pickups
  const filteredPickups = React.useMemo(() => {
    const sorted = [...pickups].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sorted.filter((p) => {
      if (typeFilter === "SMART" && p.isBulk) return false;
      if (typeFilter === "BULK" && !p.isBulk) return false;
      
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesId = p.id.toLowerCase().includes(query);
        const matchesAddress = (p.pickupFormattedAddress || "").toLowerCase().includes(query);
        const matchesMaterial = p.items.some(i => i.category.toLowerCase().includes(query));
        const matchesStatus = PICKUP_STATUS_LABEL[p.status].toLowerCase().includes(query);
        if (!matchesId && !matchesAddress && !matchesMaterial && !matchesStatus) return false;
      }
      return true;
    });
  }, [pickups, typeFilter, statusFilter, searchQuery]);

  // Statistics
  const totalRequests = pickups.length;
  const smartPickups = pickups.filter(p => !p.isBulk).length;
  const bulkPickups = pickups.filter(p => p.isBulk).length;
  const completedCount = pickups.filter(p => p.status === "COMPLETED").length;
  const pendingCount = pickups.filter(p => p.status === "PENDING").length;

  const renderProgressTimeline = (pickup: PickupRequestSummary) => {
    const isBulk = pickup.isBulk;
    
    // Status progressions
    let step = 0;
    if (pickup.status === "PENDING") step = 0; // Request Submitted / Open for Bidding
    else if (pickup.status === "ASSIGNED") step = 1;
    else if (pickup.status === "EN_ROUTE" || pickup.status === "ARRIVED" || pickup.status === "VERIFYING_WEIGHTS") step = 2;
    else if (pickup.status === "COMPLETED") step = 3;
    else if (pickup.status === "CANCELLED") step = -1;

    const widthPercent = step === -1 ? "0%" : step === 0 ? "0%" : step === 1 ? "33%" : step === 2 ? "66%" : "100%";

    return (
      <div className="relative pt-1 pb-3 px-2 sm:px-6 mt-4 mb-2">
        {/* Background track */}
        <div className="absolute top-3 left-10 right-10 h-1 bg-neutral-200 rounded-full" />
        
        {/* Active track */}
        <div 
          className="absolute top-3 left-10 h-1 bg-emerald-500 rounded-full transition-all duration-500" 
          style={{ width: widthPercent }}
        />

        <div className="relative flex justify-between text-center">
          <div className="flex flex-col items-center gap-2 w-20 -ml-6">
            <div className={cn("h-4 w-4 rounded-full border-4 border-white z-10", step >= 0 ? "bg-emerald-500" : "bg-neutral-300")} />
            <span className={cn("text-[10px] uppercase font-bold tracking-wider", step >= 0 ? "text-emerald-700" : "text-neutral-400")}>Submitted</span>
          </div>
          <div className="flex flex-col items-center gap-2 w-20">
            <div className={cn("h-4 w-4 rounded-full border-4 border-white z-10", step >= 1 ? "bg-emerald-500" : "bg-neutral-300")} />
            <span className={cn("text-[10px] uppercase font-bold tracking-wider", step >= 1 ? "text-emerald-700" : "text-neutral-400")}>{isBulk ? "Assigned" : "Assigned"}</span>
          </div>
          <div className="flex flex-col items-center gap-2 w-20">
            <div className={cn("h-4 w-4 rounded-full border-4 border-white z-10", step >= 2 ? "bg-emerald-500" : "bg-neutral-300")} />
            <span className={cn("text-[10px] uppercase font-bold tracking-wider", step >= 2 ? "text-emerald-700" : "text-neutral-400")}>In Progress</span>
          </div>
          <div className="flex flex-col items-center gap-2 w-20 -mr-6">
            <div className={cn("h-4 w-4 rounded-full border-4 border-white z-10", step >= 3 ? "bg-emerald-500" : "bg-neutral-300")} />
            <span className={cn("text-[10px] uppercase font-bold tracking-wider", step >= 3 ? "text-emerald-700" : "text-neutral-400")}>Completed</span>
          </div>
        </div>
      </div>
    );
  };

<<<<<<< Updated upstream
  const renderCard = (pickup: PickupRequestSummary) => {
    const isExpanded = expandedPickupId === pickup.id;
=======
  const renderCard = (pickup: PickupRequestSummary | BulkMarketplaceRequest) => {
    const isBulkReq = 'wasteTypes' in pickup;
    
    if (isBulkReq) {
      const bReq = pickup as BulkMarketplaceRequest;
      const displayStatus = bReq.status.replace(/_/g, " ");
      const acceptedQuote = bReq.quotations?.find((q: any) => q.status === "ACCEPTED");
      let materials: any[] = [];
      try {
        materials = typeof bReq.wasteTypes === 'string' ? JSON.parse(bReq.wasteTypes) : bReq.wasteTypes;
      } catch(e) {}
      
      return (
        <Card key={bReq.id} className="relative flex flex-col border border-neutral-100 shadow-sm transition-shadow hover:shadow-md overflow-hidden rounded-2xl p-0 bg-white">
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
                    <span className="text-xs font-data text-neutral-400 bg-neutral-100 px-2 py-1 rounded-full">#{bReq.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <p className="text-sm font-medium text-neutral-500 mt-1">
                    {new Date(bReq.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-4 py-2 rounded-full text-sm font-semibold shadow-sm bg-blue-100 text-blue-800 tracking-wide uppercase">
                  {displayStatus}
                </span>
                <Button variant="secondary" size="sm" onClick={() => setBulkDetailsPickup(bReq)}>
                  View Details
                </Button>
                {bReq.status === "COMPLETED" && (
                  (bReq as any).rating ? (
                    <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-3 py-2 rounded-full text-sm font-medium border border-yellow-200">
                      <Icon icon={Star} size="sm" className="fill-current w-4 h-4" />
                      <span>{(bReq as any).rating.score}</span>
                    </div>
                  ) : (
                    <Button className="bg-yellow-500 hover:bg-yellow-600 text-white border-transparent" size="sm" onClick={() => setCompanyRatingModalPickupId(bReq.id)}>
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
                    <p className="text-caption text-neutral-500 mb-1">Assigned Recycling Company</p>
                    <p className="text-body-sm font-semibold text-neutral-900">{bReq.assignedCompany?.fullName || "N/A"}</p>
                  </div>
                </div>
                <div className="flex-1 flex items-center gap-4 bg-neutral-50/50 border border-neutral-100 rounded-xl p-4">
                  <Icon icon={Tag} size="sm" className="text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-caption text-neutral-500 mb-1">Accepted Price</p>
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
    }
    
    const pReq = pickup as PickupRequestSummary;
    const isExpanded = expandedPickupId === pReq.id;
>>>>>>> Stashed changes
    const isOffersView = isExpanded && expandedView === "offers";
    const isTrackView = isExpanded && expandedView === "track";
    
    // Check if it's bulk
    const isBulk = pickup.isBulk;
    
    return (
      <Card key={pickup.id} className="relative flex flex-col border border-neutral-100 shadow-sm transition-shadow hover:shadow-md overflow-hidden rounded-2xl p-0 bg-white">
        <div className="p-5 sm:p-6 flex flex-col gap-5">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl shrink-0", isBulk ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600")}>
                <Icon icon={isBulk ? Package : Truck} size="md" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-neutral-900 leading-tight truncate">
                    {isBulk ? "Bulk Waste Pickup" : "Smart Pickup"}
                  </h3>
<<<<<<< Updated upstream
                  <span className="text-xs font-data text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">#{pickup.id.slice(-6).toUpperCase()}</span>
                </div>
                <p className="text-sm font-medium text-neutral-500 mt-0.5">
                  {new Date(pickup.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
=======
                  <span className="text-xs font-data text-neutral-400 bg-neutral-100 px-2 py-1 rounded-full">#{pReq.id.slice(-6).toUpperCase()}</span>
                </div>
                <p className="text-sm font-medium text-neutral-500 mt-1">
                  {new Date(pReq.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
>>>>>>> Stashed changes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
<<<<<<< Updated upstream
              <StatusPill tone={PICKUP_STATUS_TONE[pickup.status]} className="text-sm px-4 py-1.5 shadow-sm">
                {PICKUP_STATUS_LABEL[pickup.status]}
=======
              <StatusPill tone={PICKUP_STATUS_TONE[pReq.status]} className="text-sm px-4 py-2 shadow-sm">
                {PICKUP_STATUS_LABEL[pReq.status]}
>>>>>>> Stashed changes
              </StatusPill>
              <button 
                onClick={() => {
                  if (isExpanded) {
                    setExpandedPickupId(null);
                    setExpandedView(null);
                  } else {
                    setExpandedPickupId(pickup.id);
                  }
                }}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-500 transition-colors"
              >
                <Icon icon={isExpanded ? ChevronUp : ChevronDown} size="sm" />
              </button>
            </div>
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="flex flex-col gap-6 animate-fade-in-up">
              {renderProgressTimeline(pickup)}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Items */}
                <div className="flex flex-col gap-3 bg-neutral-50/50 border border-neutral-100 rounded-xl p-4">
                  <p className="text-caption text-neutral-500 uppercase tracking-wider">Materials & Weight</p>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    {pickup.items.map((item) => (
                      <div key={item.id} className="flex flex-col gap-1 items-start bg-white border border-neutral-100 p-2 rounded-lg shadow-sm">
                        <WasteCategoryChip category={item.category} />
                        <span className="text-caption text-neutral-500 font-medium px-1 truncate w-full" title={isBulk ? "Bulk Weight" : `${LOAD_SIZE_LABELS[item.loadSize]} (${formatKgRange(item.loadSize)})`}>
                          {isBulk ? (item.exactWeightKg ? `${item.exactWeightKg} kg` : "Bulk Weight") : LOAD_SIZE_LABELS[item.loadSize]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Details */}
                <div className="flex flex-col gap-3">
                  <div className="flex-1 flex items-center gap-4 bg-neutral-50/50 border border-neutral-100 rounded-xl p-4">
                    <Icon icon={Calendar} size="sm" className="text-emerald-600 shrink-0" />
                    <div>
<<<<<<< Updated upstream
                      <p className="text-caption text-neutral-500 mb-0.5">Time window</p>
                      <p className="text-body-sm font-semibold text-neutral-900">{formatPickupWindow(pickup.timeSlotStart, pickup.timeSlotEnd)}</p>
=======
                      <p className="text-caption text-neutral-500 mb-1">Time window</p>
                      <p className="text-body-sm font-semibold text-neutral-900">{formatPickupWindow(pReq.timeSlotStart, pReq.timeSlotEnd)}</p>
>>>>>>> Stashed changes
                    </div>
                  </div>
                  <div className="flex-1 flex items-center gap-4 bg-neutral-50/50 border border-neutral-100 rounded-xl p-4">
                    <Icon icon={MapPin} size="sm" className="text-emerald-600 shrink-0" />
                    <div className="min-w-0">
<<<<<<< Updated upstream
                      <p className="text-caption text-neutral-500 mb-0.5">Address</p>
                      <p className="text-body-sm font-semibold text-neutral-900 truncate" title={pickup.pickupFormattedAddress}>{pickup.pickupFormattedAddress}</p>
=======
                      <p className="text-caption text-neutral-500 mb-1">Address</p>
                      <p className="text-body-sm font-semibold text-neutral-900 truncate" title={pReq.pickupFormattedAddress}>{pReq.pickupFormattedAddress}</p>
>>>>>>> Stashed changes
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                {pickup.status === "COMPLETED" && !pickup.hasRating && (
                  <Button
                    onClick={() => setRatingModalPickupId(pickup.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    size="sm"
                  >
                    Rate collector
                  </Button>
                )}
                {pickup.status === "COMPLETED" && (
                  <Button
                    onClick={() => setReceiptModalPickupId(pickup.id)}
                    variant="secondary"
                    size="sm"
                  >
                    View receipt
                  </Button>
                )}

                {pickup.status === "PENDING" && (
                  <>
                    {cancelErrors[pickup.id] && <ErrorBanner className="w-full mb-2">{cancelErrors[pickup.id]}</ErrorBanner>}
                    <Button 
                      onClick={() => setExpandedView(expandedView === "offers" ? null : "offers")} 
                      variant="secondary" 
                      size="sm"
                    >
                      {expandedView === "offers" ? "Hide offers" : "View offers"}
                    </Button>
                    <InlineConfirm
                      confirming={confirmingId === pickup.id}
                      triggerRef={getCancelTriggerRef(pickup.id)}
                      trigger={
                        <Button
                          ref={getCancelTriggerRef(pickup.id)}
                          variant="destructive"
                          size="sm"
                          disabled={cancellingId === pickup.id}
                          onClick={() => setConfirmingId(pickup.id)}
                        >
                          {cancellingId === pickup.id ? "Cancelling…" : "Cancel request"}
                        </Button>
                      }
                      message="Cancel this pickup request? This can't be undone."
                      confirmLabel={cancellingId === pickup.id ? "Cancelling…" : "Yes, cancel"}
                      cancelLabel="Never mind"
                      isConfirmPending={cancellingId === pickup.id}
                      onConfirm={() => {
                        setConfirmingId(null);
                        void handleCancelPickup(pickup.id);
                      }}
                      onCancel={() => setConfirmingId(null)}
                    />
                  </>
                )}

                {(pickup.status === "ASSIGNED" || pickup.status === "EN_ROUTE" || pickup.status === "ARRIVED" || pickup.status === "VERIFYING_WEIGHTS") && (
                  <Button 
                    onClick={() => setExpandedView(expandedView === "track" ? null : "track")} 
                    variant="secondary" 
                    size="sm"
                  >
                    {expandedView === "track" ? "Hide tracking" : "Track pickup"}
                  </Button>
                )}
              </div>
            </div>
          )}

          {isOffersView && (
            <PickupOffersPanel 
              pickup={pickup} 
              onOfferAccepted={() => {
                fetchPickups().then(() => {
                  setExpandedView("track");
                });
              }} 
            />
          )}

          {isTrackView && (
            <TrackPickupPanel 
              pickupSummary={pickup}
              onCompleted={() => {
                fetchPickups().then(() => {
                  setExpandedPickupId(null);
                  setExpandedView(null);
                });
              }}
            />
          )}
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card className="p-4 bg-white border border-neutral-100 shadow-sm text-center">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Total</p>
              <p className="text-3xl font-black text-neutral-900 mt-2">{totalRequests}</p>
            </Card>
            <Card className="p-4 bg-white border border-neutral-100 shadow-sm text-center">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Smart Pickups</p>
              <p className="text-3xl font-black text-emerald-900 mt-2">{smartPickups}</p>
            </Card>
            <Card className="p-4 bg-white border border-neutral-100 shadow-sm text-center">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-widest">Bulk Pickups</p>
              <p className="text-3xl font-black text-blue-900 mt-2">{bulkPickups}</p>
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex bg-neutral-100 rounded-xl p-1 shrink-0 overflow-x-auto w-full md:w-auto">
              <button 
                onClick={() => setTypeFilter("ALL")}
<<<<<<< Updated upstream
                className={cn("px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex-1 md:flex-none", typeFilter === "ALL" ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}
=======
                className={cn("px-5 py-3 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap flex-1 lg:flex-none", typeFilter === "ALL" ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}
>>>>>>> Stashed changes
              >
                All
              </button>
              <button 
                onClick={() => setTypeFilter("SMART")}
<<<<<<< Updated upstream
                className={cn("px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex-1 md:flex-none", typeFilter === "SMART" ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}
=======
                className={cn("px-5 py-3 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap flex-1 lg:flex-none", typeFilter === "SMART" ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}
>>>>>>> Stashed changes
              >
                Smart Pickup
              </button>
              <button 
                onClick={() => setTypeFilter("BULK")}
<<<<<<< Updated upstream
                className={cn("px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex-1 md:flex-none", typeFilter === "BULK" ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}
=======
                className={cn("px-5 py-3 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap flex-1 lg:flex-none", typeFilter === "BULK" ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}
>>>>>>> Stashed changes
              >
                Bulk Pickup
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
<<<<<<< Updated upstream
                className="bg-white border border-neutral-200 text-sm font-medium rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 shrink-0 w-full sm:w-auto"
=======
                className="bg-white border border-neutral-200 text-sm font-medium rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-[200px] shrink-0"
>>>>>>> Stashed changes
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending &amp; Bidding</option>
                <option value="ASSIGNED">Collector Assigned</option>
                <option value="EN_ROUTE">En Route</option>
                <option value="ARRIVED">Arrived</option>
                <option value="VERIFYING_WEIGHTS">Verifying Weights</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <div className="relative w-full sm:w-64">
                <Icon icon={Search} size="sm" className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input 
                  type="text" 
                  placeholder="Search material, ID, location..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
<<<<<<< Updated upstream
                  className="bg-white border border-neutral-200 text-sm rounded-xl pl-9 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 w-full"
=======
                  className="bg-white border border-neutral-200 text-sm font-medium rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 w-full"
>>>>>>> Stashed changes
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

      {receiptModalPickupId && (
        <ReceiptModal 
          pickupId={receiptModalPickupId} 
          onClose={() => setReceiptModalPickupId(null)} 
          onRateCollector={() => {
            const id = receiptModalPickupId;
            setReceiptModalPickupId(null);
            setTimeout(() => setRatingModalPickupId(id), 0);
          }}
        />
      )}

      {ratingModalPickupId && (
        <CollectorRatingModal
          pickupId={ratingModalPickupId}
          onClose={() => setRatingModalPickupId(null)}
          onSuccess={() => {
            setRatingModalPickupId(null);
            void fetchPickups(true);
          }}
        />
      )}
    </PageContainer>
  );
}
