"use client";

import * as React from "react";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CategoryQuantityRow } from "@/components/CategoryQuantityRow";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Icon } from "@/components/Icon";
import { InlineConfirm } from "@/components/InlineConfirm";
import { PageContainer } from "@/components/PageContainer";
import { ReceiptModal } from "@/components/ReceiptModal";
import { StatusPill } from "@/components/StatusPill";
import { SummaryRow } from "@/components/SummaryPanel";
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

  const fetchPickups = React.useCallback(() => {
    setLoadState("loading");
    setLoadError(null);
    return listPickups()
      .then(({ pickups: rows }) => {
        setPickups(rows);
        setLoadState("ready");
      })
      .catch((err: unknown) => {
        setLoadError(
          err instanceof AuthApiError
            ? "Couldn't load your pickups. Try refreshing the page."
            : "Something went wrong loading your pickups. Try refreshing the page.",
        );
        setLoadState("error");
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
        <Card className="mt-8 flex flex-col items-center gap-3 py-10 text-center">
          <Icon icon={ClipboardList} size="lg" className="text-neutral-400" aria-hidden />
          <div>
            <p className="text-h4 text-neutral-900">No pickups yet</p>
            <p className="mt-1 text-body-sm text-neutral-500">
              Once you request a pickup, it&apos;ll show up here with its status and weight.
            </p>
          </div>
          <Button href="/dashboard/pickups/new">Request a pickup</Button>
        </Card>
      )}

      {loadState === "ready" && pickups.length > 0 && (
        <div className="mt-8 flex flex-col gap-12">
          {(() => {
            const activePickups = pickups.filter((p) => p.status !== "COMPLETED" && p.status !== "CANCELLED");
            const historyPickups = pickups.filter((p) => p.status === "COMPLETED" || p.status === "CANCELLED");

            const renderPickupCard = (pickup: PickupRequestSummary) => (
              <Card key={pickup.id} className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="text-body-sm text-neutral-500">Items</p>
                  <StatusPill tone={PICKUP_STATUS_TONE[pickup.status]}>
                    {PICKUP_STATUS_LABEL[pickup.status]}
                  </StatusPill>
                </div>

                <div className="flex flex-col gap-2">
                  {pickup.items.map((item) => (
                    <CategoryQuantityRow
                      key={item.id}
                      category={item.category}
                      quantityLabel={`${LOAD_SIZE_LABELS[item.loadSize]} (${formatKgRange(item.loadSize)})`}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <SummaryRow label="Window" value={formatPickupWindow(pickup.timeSlotStart, pickup.timeSlotEnd)} />
                  <SummaryRow label="Address" value={pickup.pickupFormattedAddress} />
                </div>

                {(pickup.status === "ASSIGNED" || pickup.status === "EN_ROUTE" || pickup.status === "ARRIVED" || pickup.status === "VERIFYING_WEIGHTS" || pickup.status === "COMPLETED") && (
                  <div className="flex justify-end">
                    {pickup.status === "COMPLETED" ? (
                      <Button
                        onClick={() => setReceiptModalPickupId(pickup.id)}
                        variant="secondary"
                        size="sm"
                      >
                        View receipt
                      </Button>
                    ) : (
                      <Button href={`/dashboard/pickups/${pickup.id}/track`} variant="secondary" size="sm">
                        Track pickup
                      </Button>
                    )}
                  </div>
                )}

                {pickup.status === "PENDING" && (
                  <div className="flex flex-col gap-2">
                    {cancelErrors[pickup.id] && <ErrorBanner>{cancelErrors[pickup.id]}</ErrorBanner>}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Button href={`/dashboard/pickups/${pickup.id}/offers`} variant="secondary" size="sm">
                        View offers
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
                    </div>
                  </div>
                )}
              </Card>
            );

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
    </PageContainer>
  );
}
