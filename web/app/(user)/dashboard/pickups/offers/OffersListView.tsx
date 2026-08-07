"use client";

import * as React from "react";
import { HandCoins } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CategoryQuantityRow } from "@/components/CategoryQuantityRow";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Icon } from "@/components/Icon";
import { PageContainer } from "@/components/PageContainer";
import { SummaryRow } from "@/components/SummaryPanel";
import { AuthApiError } from "@/lib/api/auth";
import { listPickups, LOAD_SIZE_LABELS, formatKgRange, type PickupRequestSummary } from "@/lib/api/pickups";

function formatPickupWindow(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const dateLabel = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const startTime = start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const endTime = end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${dateLabel} · ${startTime} - ${endTime}`;
}

type LoadState = "loading" | "ready" | "error";

export function OffersListView() {
  const [loadState, setLoadState] = React.useState<LoadState>("loading");
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [openPickups, setOpenPickups] = React.useState<PickupRequestSummary[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    listPickups()
      .then(({ pickups }) => {
        if (cancelled) return;
        setOpenPickups(pickups.filter((pickup) => pickup.status === "PENDING"));
        setLoadState("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          err instanceof AuthApiError
            ? "Couldn't load your offers. Try refreshing the page."
            : "Something went wrong loading your offers. Try refreshing the page.",
        );
        setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageContainer className="py-8 lg:py-12">
      <h1 className="text-h1 text-neutral-900">Offers</h1>
      <p className="mt-2 text-body-lg text-neutral-500">
        Pickup requests that are still open — review the offers collectors have sent and accept one.
      </p>

      {loadState === "loading" && (
        <Card className="mt-8 text-center">
          <p className="text-body-sm text-neutral-500">Loading your open requests…</p>
        </Card>
      )}

      {loadState === "error" && <ErrorBanner className="mt-8">{loadError}</ErrorBanner>}

      {loadState === "ready" && openPickups.length === 0 && (
        <Card className="mt-8 flex flex-col items-center gap-3 py-10 text-center">
          <Icon icon={HandCoins} size="lg" className="text-neutral-400" aria-hidden />
          <div>
            <p className="text-h4 text-neutral-900">No open requests right now</p>
            <p className="mt-1 text-body-sm text-neutral-500">
              Once you request a pickup, any offers collectors send will show up here.
            </p>
          </div>
          <Button href="/dashboard/pickups/new">Request a pickup</Button>
        </Card>
      )}

      {loadState === "ready" && openPickups.length > 0 && (
        <div className="mt-8 flex flex-col gap-4">
          {openPickups.map((pickup) => (
            <Card key={pickup.id} className="flex flex-col gap-4">
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

              <div className="flex justify-end">
                <Button href={`/dashboard/pickups/${pickup.id}/offers`} size="sm">
                  View offers
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
