"use client";

import * as React from "react";
import { ClipboardList, Package, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CategoryQuantityRow } from "@/components/CategoryQuantityRow";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Icon } from "@/components/Icon";
import { InlineConfirm } from "@/components/InlineConfirm";
import { PageContainer } from "@/components/PageContainer";
import { CollectorRatingModal } from "@/components/CollectorRatingModal";
import { ReceiptModal } from "@/components/ReceiptModal";
import { StatusPill } from "@/components/StatusPill";
import { SummaryRow } from "@/components/SummaryPanel";
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
  const startTime = start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const endTime = end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${dateLabel} · ${startTime} - ${endTime}`;
}

type LoadState = "loading" | "ready" | "error";

export function MyPickupsView() {
  const [loadState, setLoadState] = React.useState<LoadState>("loading");
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [pickups, setPickups] = React.useState<PickupRequestSummary[]>([]);

  const [cancellingId, setCancellingId] = React.useState<string | null>(null);
  const [cancelErrors, setCancelErrors] = React.useState<Record<string, string>>({});
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);
  const [receiptModalPickupId, setReceiptModalPickupId] = React.useState<string | null>(null);
  const [ratingModalPickupId, setRatingModalPickupId] = React.useState<string | null>(null);
  
  const [expandedPickupId, setExpandedPickupId] = React.useState<string | null>(null);
  const [expandedView, setExpandedView] = React.useState<"offers" | "track" | null>(null);

  const cancelTriggerRefs = React.useRef<Map<string, React.RefObject<HTMLButtonElement | HTMLAnchorElement>>>(
    new Map(),
  );
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

  // Global socket listener to auto-expand the tracking panel when status changes to VERIFYING_WEIGHTS
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

  // Join the tracking room for all active pickups so we can receive global status updates
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

  return (
    <PageContainer className="py-8 lg:py-12">
      <h1 className="text-h1 text-neutral-900">My Pickups</h1>
      <p className="mt-2 text-body-lg text-neutral-500">
        Every pickup you&apos;ve requested, its status, and its verified weight once collected.
      </p>

      {loadState === "loading" && (
        <Card className="mt-8 text-center">
          <p className="text-body-sm text-neutral-500">Loading your pickups…</p>
        </Card>
      )}

      {loadState === "error" && <ErrorBanner className="mt-8">{loadError}</ErrorBanner>}

      {loadState === "ready" && pickups.length === 0 && (
        <Card className="glass-panel mt-8 flex flex-col items-center gap-4 py-16 text-center shadow-lg border-0">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-primary-600">
            <Icon icon={ClipboardList} size="lg" aria-hidden />
          </div>
          <div>
            <p className="font-heading text-h3 text-neutral-900">No pickups yet</p>
            <p className="mt-2 text-body-lg text-neutral-500 max-w-sm mx-auto">
              Once you request a pickup, it'll show up here with live tracking and verified weights.
            </p>
          </div>
          <Button href="/dashboard/pickups/new" className="mt-4 px-8">Request your first pickup</Button>
        </Card>
      )}

      {loadState === "ready" && pickups.length > 0 && (
        <div className="mt-8 flex flex-col gap-12">
          {(() => {
            const activePickups = pickups.filter((p) => p.status !== "COMPLETED" && p.status !== "CANCELLED");
            const historyPickups = pickups.filter((p) => p.status === "COMPLETED" || p.status === "CANCELLED");

            const renderPickupCard = (pickup: PickupRequestSummary) => {
              const isExpanded = expandedPickupId === pickup.id;
              const isOffersView = isExpanded && expandedView === "offers";
              const isTrackView = isExpanded && expandedView === "track";

              return (
              <Card key={pickup.id} className="glass-panel relative flex flex-col border-0 shadow-xl transition-all hover:shadow-2xl overflow-hidden rounded-[2rem] p-0 animate-slide-up">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-400 to-emerald-500 opacity-80" />
                
                <div className="p-6 sm:p-8 flex flex-col gap-6">
                  {/* Header */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 pb-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 shadow-inner shrink-0">
                        <Icon icon={Package} size="md" />
                      </div>
                      <div>
                        <h3 className="font-heading text-h4 text-neutral-900 leading-tight">Pickup Request</h3>
                        <p className="text-body-sm text-neutral-500">
                          {new Date(pickup.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <StatusPill tone={PICKUP_STATUS_TONE[pickup.status]} className="text-body-sm px-4 py-1.5 shadow-sm">
                      {PICKUP_STATUS_LABEL[pickup.status]}
                    </StatusPill>
                  </div>

                  {/* Body Content */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Items */}
                    <div className="flex flex-col gap-4">
                      <p className="text-label text-neutral-500 uppercase tracking-wider">Items to collect</p>
                      <div className="flex flex-col gap-3">
                        {pickup.items.map((item) => (
                          <div key={item.id} className="bg-neutral-50/50 border border-neutral-100 rounded-xl p-3 pl-4 transition-colors hover:bg-neutral-50">
                            <CategoryQuantityRow
                              category={item.category}
                              quantityLabel={`${LOAD_SIZE_LABELS[item.loadSize]} (${formatKgRange(item.loadSize)})`}
                              className="w-full flex-nowrap"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex flex-col gap-4">
                      <p className="text-label text-neutral-500 uppercase tracking-wider">Pickup details</p>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-4 bg-neutral-50/50 border border-neutral-100 rounded-xl p-3 transition-colors hover:bg-neutral-50">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm text-primary-600">
                            <Icon icon={Calendar} size="sm" />
                          </div>
                          <div>
                            <p className="text-label text-neutral-500 mb-0.5">Time window</p>
                            <p className="text-body-sm font-semibold text-neutral-900">{formatPickupWindow(pickup.timeSlotStart, pickup.timeSlotEnd)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 bg-neutral-50/50 border border-neutral-100 rounded-xl p-3 transition-colors hover:bg-neutral-50">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm text-primary-600">
                            <Icon icon={MapPin} size="sm" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-label text-neutral-500 mb-0.5">Address</p>
                            <p className="text-body-sm font-semibold text-neutral-900 truncate">{pickup.pickupFormattedAddress}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-end gap-3 pt-5 border-t border-neutral-100 mt-2">
                    {pickup.status === "PENDING" && (
                      <>
                        {cancelErrors[pickup.id] && <ErrorBanner className="w-full mb-2">{cancelErrors[pickup.id]}</ErrorBanner>}
                        <Button 
                          onClick={() => {
                            if (expandedPickupId === pickup.id && expandedView === "offers") {
                              setExpandedPickupId(null);
                              setExpandedView(null);
                            } else {
                              setExpandedPickupId(pickup.id);
                              setExpandedView("offers");
                            }
                          }} 
                          variant="secondary" 
                          size="sm"
                        >
                          {expandedPickupId === pickup.id && expandedView === "offers" ? "Hide offers" : "View offers"}
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

                    {(pickup.status === "ASSIGNED" || pickup.status === "EN_ROUTE" || pickup.status === "ARRIVED" || pickup.status === "VERIFYING_WEIGHTS" || pickup.status === "COMPLETED") && (
                      <>
                        {pickup.status === "COMPLETED" ? (
                          <>
                            {!pickup.hasRating && (
                              <Button
                                onClick={() => setRatingModalPickupId(pickup.id)}
                                variant="primary"
                                size="sm"
                              >
                                Rate collector
                              </Button>
                            )}
                            <Button
                              onClick={() => setReceiptModalPickupId(pickup.id)}
                              variant="secondary"
                              size="sm"
                            >
                              View receipt
                            </Button>
                          </>
                        ) : pickup.status === "ASSIGNED" ? (
                          <Button 
                            disabled 
                            variant="secondary" 
                            size="sm"
                          >
                            Collector assigned
                          </Button>
                        ) : (
                          <Button 
                            onClick={() => {
                              if (expandedPickupId === pickup.id && expandedView === "track") {
                                setExpandedPickupId(null);
                                setExpandedView(null);
                              } else {
                                setExpandedPickupId(pickup.id);
                                setExpandedView("track");
                              }
                            }} 
                            variant="secondary" 
                            size="sm"
                          >
                            {expandedPickupId === pickup.id && expandedView === "track" ? "Hide tracking" : "Track pickup"}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                
                {isOffersView && (
                  <PickupOffersPanel 
                    pickup={pickup} 
                    onOfferAccepted={() => {
                      // Fetch fresh pickups, then open the track view
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
              <>
                {activePickups.length > 0 && (
                  <div>
                    <h2 className="text-h3 text-neutral-900 mb-4">Active Pickups</h2>
                    <div className="flex flex-col gap-4">
                      {activePickups.map(renderPickupCard)}
                    </div>
                  </div>
                )}
                {historyPickups.length > 0 && (
                  <div>
                    <h2 className="text-h3 text-neutral-900 mb-4">Completed History</h2>
                    <div className="flex flex-col gap-4">
                      {historyPickups.map(renderPickupCard)}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {receiptModalPickupId && (
        <ReceiptModal 
          pickupId={receiptModalPickupId} 
          onClose={() => setReceiptModalPickupId(null)} 
        />
      )}

      {ratingModalPickupId && (
        <CollectorRatingModal
          pickupId={ratingModalPickupId}
          onClose={() => setRatingModalPickupId(null)}
          onSuccess={() => {
            setRatingModalPickupId(null);
            void fetchPickups(true); // Refresh silently to hide the rate button
          }}
        />
      )}
    </PageContainer>
  );
}
