"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Icon } from "@/components/Icon";
import { PageContainer } from "@/components/PageContainer";
import { StatusPill } from "@/components/StatusPill";
import { SummaryRow } from "@/components/SummaryPanel";
import { AuthApiError } from "@/lib/api/auth";
import { listPickups, type PickupRequestSummary } from "@/lib/api/pickups";
import { PICKUP_STATUS_TONE, PICKUP_STATUS_LABEL } from "@/lib/pickupStatus";

const ACTIVE_STATUSES: readonly PickupRequestSummary["status"][] = ["ASSIGNED", "EN_ROUTE", "ARRIVED"];

type LoadState = "loading" | "ready" | "error";

export function TrackPickupListView() {
  const router = useRouter();
  const [loadState, setLoadState] = React.useState<LoadState>("loading");
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [activePickups, setActivePickups] = React.useState<PickupRequestSummary[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    listPickups()
      .then(({ pickups }) => {
        if (cancelled) return;
        const active = pickups.filter((pickup) => ACTIVE_STATUSES.includes(pickup.status));
        if (active.length === 1) {
          router.replace(`/dashboard/pickups/${active[0].id}/track`);
          return;
        }
        setActivePickups(active);
        setLoadState("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          err instanceof AuthApiError
            ? "Couldn't load your pickups. Try refreshing the page."
            : "Something went wrong loading your pickups. Try refreshing the page.",
        );
        setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `router` identity is stable; including it would re-run this fetch pointlessly.
  }, []);

  return (
    <PageContainer className="py-8 lg:py-12">
      <h1 className="text-h1 text-neutral-900">Track pickup</h1>
      <p className="mt-2 text-body-lg text-neutral-500">
        Follow your collector&apos;s live location for any pickup currently on its way.
      </p>

      {loadState === "loading" && (
        <Card className="mt-8 text-center">
          <p className="text-body-sm text-neutral-500">Loading your active pickups…</p>
        </Card>
      )}

      {loadState === "error" && <ErrorBanner className="mt-8">{loadError}</ErrorBanner>}

      {loadState === "ready" && activePickups.length === 0 && (
        <Card className="mt-8 flex flex-col items-center gap-3 py-10 text-center">
          <Icon icon={MapPin} size="lg" className="text-neutral-400" aria-hidden />
          <div>
            <p className="text-h4 text-neutral-900">No active pickups</p>
            <p className="mt-1 text-body-sm text-neutral-500">
              Once a collector accepts one of your requests, you&apos;ll be able to track them here.
            </p>
          </div>
          <Button href="/dashboard/pickups">View my pickups</Button>
        </Card>
      )}

      {loadState === "ready" && activePickups.length > 1 && (
        <div className="mt-8 flex flex-col gap-4">
          {activePickups.map((pickup) => (
            <Card key={pickup.id} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <SummaryRow label="Address" value={pickup.pickupFormattedAddress} />
                <StatusPill tone={PICKUP_STATUS_TONE[pickup.status]}>
                  {PICKUP_STATUS_LABEL[pickup.status]}
                </StatusPill>
              </div>
              <div className="flex justify-end">
                <Button href={`/dashboard/pickups/${pickup.id}/track`} size="sm">
                  Track pickup
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
