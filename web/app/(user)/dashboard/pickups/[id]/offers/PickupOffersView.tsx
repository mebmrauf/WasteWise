"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Inbox, Info } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CategoryQuantityRow } from "@/components/CategoryQuantityRow";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Icon } from "@/components/Icon";
import { OfferListItem } from "@/components/OfferListItem";
import { PageContainer } from "@/components/PageContainer";
import { StatusPill } from "@/components/StatusPill";
import { SummaryRow } from "@/components/SummaryPanel";
import { AuthApiError } from "@/lib/api/auth";
import { acceptOffer } from "@/lib/api/offers";
import {
  getPickupDetail,
  getPickupOffers,
  LOAD_SIZE_LABELS,
  formatKgRange,
  type PickupOffer,
  type PickupRequestDetail,
} from "@/lib/api/pickups";
import { resolveAvatarUrl } from "@/lib/api/users";
import { PICKUP_STATUS_TONE, PICKUP_STATUS_LABEL } from "@/lib/pickupStatus";

const loadErrorMessages: Record<string, string> = {
  FORBIDDEN: "You don't have access to this pickup's offers.",
  NOT_FOUND: "We couldn't find this pickup request.",
};

function resolveLoadErrorMessage(err: unknown): string {
  if (err instanceof AuthApiError) {
    return loadErrorMessages[err.code] ?? "Couldn't load offers for this pickup. Try refreshing the page.";
  }
  return "Something went wrong loading offers for this pickup. Try refreshing the page.";
}

const acceptErrorMessages: Record<string, string> = {
  FORBIDDEN: "You're not able to accept this offer.",
  NOT_FOUND: "This offer no longer exists. The list below has been refreshed.",
  PICKUP_NOT_OPEN:
    "This request has already been assigned to another collector. The list below has been refreshed.",
  OFFER_NOT_PENDING: "This offer is no longer pending. The list below has been refreshed.",
};

function resolveAcceptErrorMessage(err: unknown): string {
  if (err instanceof AuthApiError) {
    return acceptErrorMessages[err.code] ?? "Couldn't accept this offer. Try again.";
  }
  return "Couldn't accept this offer. Try again.";
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

export function PickupOffersView({ pickupId }: { pickupId: string }) {
  const router = useRouter();

  const [loadState, setLoadState] = React.useState<LoadState>("loading");
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [pickup, setPickup] = React.useState<PickupRequestDetail | null>(null);
  const [offers, setOffers] = React.useState<PickupOffer[]>([]);

  const [acceptingOfferId, setAcceptingOfferId] = React.useState<string | null>(null);
  const [acceptErrors, setAcceptErrors] = React.useState<Record<string, string>>({});

  const fetchAll = React.useCallback(() => {
    setLoadState("loading");
    setLoadError(null);
    return Promise.all([getPickupDetail(pickupId), getPickupOffers(pickupId)])
      .then(([{ pickup: detail }, { offers: offerRows }]) => {
        setPickup(detail);
        setOffers(offerRows);
        setLoadState("ready");
      })
      .catch((err: unknown) => {
        setLoadError(resolveLoadErrorMessage(err));
        setLoadState("error");
      });
  }, [pickupId]);

  React.useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  async function handleAcceptOffer(offerId: string) {
    setAcceptErrors((prev) => {
      const next = { ...prev };
      delete next[offerId];
      return next;
    });
    setAcceptingOfferId(offerId);
    try {
      await acceptOffer(offerId);
      setAcceptingOfferId(null);
      void fetchAll();
    } catch (err) {
      setAcceptingOfferId(null);
      setAcceptErrors((prev) => ({ ...prev, [offerId]: resolveAcceptErrorMessage(err) }));
      if (
        err instanceof AuthApiError &&
        (err.code === "PICKUP_NOT_OPEN" || err.code === "OFFER_NOT_PENDING" || err.code === "NOT_FOUND")
      ) {
        void fetchAll();
      }
    }
  }

  return (
    <PageContainer className="py-8 lg:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-neutral-900">Offers on your pickup</h1>
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/pickups")}>
          Back to My Pickups
        </Button>
      </div>
      <p className="mt-2 text-body-lg text-neutral-500">
        Review each collector&apos;s bid and accept the one you&apos;d like to collect your items.
      </p>

      {loadState === "loading" && (
        <Card className="mt-8 text-center">
          <p className="text-body-sm text-neutral-500">Loading offers…</p>
        </Card>
      )}

      {loadState === "error" && <ErrorBanner className="mt-8">{loadError}</ErrorBanner>}

      {loadState === "ready" && pickup && (
        <>
          <Card className="mt-8 flex flex-col gap-4">
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
          </Card>

          {pickup.status !== "PENDING" && (
            <Card className="mt-4 flex items-start gap-3 border-info-500 bg-info-50">
              <Icon icon={Info} size="md" className="shrink-0 text-info-700" aria-hidden />
              <p className="text-body-sm text-info-700">
                This request has already been assigned — no further offers can be accepted.
              </p>
            </Card>
          )}

          {offers.length === 0 ? (
            <Card className="mt-8 flex flex-col items-center gap-3 py-10 text-center">
              <Icon icon={Inbox} size="lg" className="text-neutral-400" aria-hidden />
              <div>
                <p className="text-h4 text-neutral-900">No offers yet</p>
                <p className="mt-1 text-body-sm text-neutral-500">
                  Collectors will appear here as they bid on your request.
                </p>
              </div>
            </Card>
          ) : (
            <div className="mt-8 flex flex-col gap-4">
              {offers.map((offer) => (
                <React.Fragment key={offer.id}>
                  {acceptErrors[offer.id] && <ErrorBanner>{acceptErrors[offer.id]}</ErrorBanner>}
                  <OfferListItem
                    offer={{
                      ...offer,
                      collector: {
                        ...offer.collector,
                        avatarUrl: resolveAvatarUrl(offer.collector.avatarUrl),
                      },
                    }}
                    isPickupOpen={pickup.status === "PENDING"}
                    isAccepting={acceptingOfferId === offer.id}
                    onAccept={(offerId) => void handleAcceptOffer(offerId)}
                  />
                </React.Fragment>
              ))}
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}
