"use client";

import * as React from "react";
import { Inbox } from "lucide-react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Icon } from "@/components/Icon";
import { OfferListItem } from "@/components/OfferListItem";
import { AuthApiError } from "@/lib/api/auth";
import { acceptOffer } from "@/lib/api/offers";
import {
  getPickupOffers,
  LOAD_SIZE_KG_RANGES,
  type PickupOffer,
  type PickupRequestSummary,
} from "@/lib/api/pickups";
import { resolveAvatarUrl } from "@/lib/api/users";

const acceptErrorMessages: Record<string, string> = {
  FORBIDDEN: "You're not able to accept this offer.",
  NOT_FOUND: "This offer no longer exists. The list below has been refreshed.",
  PICKUP_NOT_OPEN: "This request has already been assigned to another collector. The list below has been refreshed.",
  OFFER_NOT_PENDING: "This offer is no longer pending. The list below has been refreshed.",
};

function resolveAcceptErrorMessage(err: unknown): string {
  if (err instanceof AuthApiError) {
    return acceptErrorMessages[err.code] ?? "Couldn't accept this offer. Try again.";
  }
  return "Couldn't accept this offer. Try again.";
}

export function PickupOffersPanel({
  pickup,
  onOfferAccepted,
}: {
  pickup: PickupRequestSummary;
  onOfferAccepted: () => void;
}) {
  const [loadState, setLoadState] = React.useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [offers, setOffers] = React.useState<PickupOffer[]>([]);

  const [acceptingOfferId, setAcceptingOfferId] = React.useState<string | null>(null);
  const [acceptErrors, setAcceptErrors] = React.useState<Record<string, string>>({});

  const fetchOffers = React.useCallback(() => {
    setLoadState("loading");
    setLoadError(null);
    getPickupOffers(pickup.id)
      .then(({ offers: offerRows }) => {
        setOffers(offerRows);
        setLoadState("ready");
      })
      .catch((err: unknown) => {
        if (err instanceof AuthApiError) {
          setLoadError(err.code === "FORBIDDEN" ? "You don't have access to this pickup's offers." : "We couldn't find this pickup request.");
        } else {
          setLoadError("Something went wrong loading offers. Try refreshing.");
        }
        setLoadState("error");
      });
  }, [pickup.id]);

  React.useEffect(() => {
    void fetchOffers();
  }, [fetchOffers]);

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
      onOfferAccepted();
    } catch (err) {
      setAcceptingOfferId(null);
      setAcceptErrors((prev) => ({ ...prev, [offerId]: resolveAcceptErrorMessage(err) }));
      if (
        err instanceof AuthApiError &&
        (err.code === "PICKUP_NOT_OPEN" || err.code === "OFFER_NOT_PENDING" || err.code === "NOT_FOUND")
      ) {
        void fetchOffers();
      }
    }
  }

  if (loadState === "loading") {
    return <div className="py-8 text-center text-body-sm text-neutral-500">Loading offers…</div>;
  }

  if (loadState === "error") {
    return <ErrorBanner className="mt-4">{loadError}</ErrorBanner>;
  }

  if (offers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 mt-4 text-center bg-white/50 rounded-xl border border-neutral-100 animate-slide-up">
        <Icon icon={Inbox} size="lg" className="text-neutral-400" aria-hidden />
        <div>
          <p className="text-h4 text-neutral-900">No offers yet</p>
          <p className="mt-1 text-body-sm text-neutral-500">
            Collectors will appear here as they bid on your request.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 mt-6 pt-6 border-t border-neutral-100 animate-slide-up">
      <h3 className="text-h4 text-neutral-900 mb-2">Available Offers</h3>
      <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-2">
        {offers.map((offer) => {
          const estimatedTotalBidRange = offer.bidAmountsPerKg
            ? pickup.items.reduce(
                (acc, item) => {
                  const bid = offer.bidAmountsPerKg?.[item.category] ?? 0;
                  const range = LOAD_SIZE_KG_RANGES[item.loadSize];
                  return {
                    min: acc.min + bid * range.minKg,
                    max: acc.max + bid * range.maxKg,
                  };
                },
                { min: 0, max: 0 }
              )
            : undefined;

          return (
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
                pickupItems={pickup.items}
                estimatedTotalBidRange={estimatedTotalBidRange}
                isPickupOpen={pickup.status === "PENDING"}
                isAccepting={acceptingOfferId === offer.id}
                onAccept={(offerId) => void handleAcceptOffer(offerId)}
              />
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
