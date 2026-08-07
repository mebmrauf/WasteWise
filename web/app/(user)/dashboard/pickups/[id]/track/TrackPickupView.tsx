"use client";

import * as React from "react";
import { Ban, Clock, Navigation } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Card } from "@/components/Card";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Icon } from "@/components/Icon";
import { Map } from "@/components/Map";
import { PageContainer } from "@/components/PageContainer";
import { StatusTimeline, type PickupTrackingStatus } from "@/components/StatusTimeline";
import { AuthApiError } from "@/lib/api/auth";
import {
  getPickupTracking,
  type CollectorLocation,
  type PickupStatus,
  type TrackedCollector,
} from "@/lib/api/pickups";
import { resolveAvatarUrl } from "@/lib/api/users";
import { VEHICLE_TYPE_LABELS } from "@/lib/vehicleType";
import {
  getTrackingSocket,
  PICKUP_ERROR_EVENT,
  PICKUP_JOIN_EVENT,
  PICKUP_JOINED_EVENT,
  PICKUP_LOCATION_EVENT,
  PICKUP_STATUS_EVENT,
  type PickupErrorPayload,
  type PickupJoinedPayload,
  type PickupLocationPayload,
  type PickupStatusPayload,
} from "@/lib/socket";

const DHAKA_FALLBACK_CENTER = { lat: 23.8103, lng: 90.4125 };

const STATUSES_ON_TIMELINE: readonly PickupStatus[] = ["ASSIGNED", "EN_ROUTE", "ARRIVED", "COMPLETED"];

function isTimelineStatus(status: PickupStatus): status is PickupTrackingStatus {
  return STATUSES_ON_TIMELINE.includes(status);
}

const trackingErrorMessages: Record<string, string> = {
  FORBIDDEN: "You don't have access to this pickup's tracking info.",
  NOT_FOUND: "We couldn't find this pickup request.",
};

function trackingErrorMessageForCode(code: string, fallback: string): string {
  return trackingErrorMessages[code] ?? fallback;
}

function resolveTrackingErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AuthApiError) {
    return trackingErrorMessageForCode(err.code, fallback);
  }
  return fallback;
}

type LoadState = "loading" | "ready" | "error";

export function TrackPickupView({ pickupId }: { pickupId: string }) {
  const [loadState, setLoadState] = React.useState<LoadState>("loading");
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [status, setStatus] = React.useState<PickupStatus | null>(null);
  const [collectorLocation, setCollectorLocation] = React.useState<CollectorLocation | null>(null);
  const [pickupLocation, setPickupLocation] = React.useState<{ lat: number; lng: number } | null>(null);
  const [collector, setCollector] = React.useState<TrackedCollector | null>(null);
  const [routeInfo, setRouteInfo] = React.useState<{ distance: string; duration: string } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    setLoadError(null);

    getPickupTracking(pickupId)
      .then((tracking) => {
        if (cancelled) return;
        setStatus(tracking.status);
        setCollectorLocation(tracking.collectorLocation);
        setPickupLocation(tracking.pickupLocation);
        setCollector(tracking.collector);
        setLoadState("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(resolveTrackingErrorMessage(err, "Couldn't load tracking info. Try refreshing the page."));
        setLoadState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [pickupId]);

  React.useEffect(() => {
    const socket = getTrackingSocket();

    function handleJoined(payload: PickupJoinedPayload) {
      if (payload.pickupRequestId !== pickupId) return;
    }

    function handleLocation(payload: PickupLocationPayload) {
      if (payload.pickupRequestId !== pickupId) return;
      setCollectorLocation({ lat: payload.lat, lng: payload.lng, updatedAt: payload.updatedAt });
    }

    function handleStatus(payload: PickupStatusPayload) {
      if (payload.pickupRequestId !== pickupId) return;
      setStatus(payload.status);
    }

    function handleError(payload: PickupErrorPayload) {
      if (payload.event !== PICKUP_JOIN_EVENT) return;
      if (payload.pickupRequestId && payload.pickupRequestId !== pickupId) return;
      setLoadError(
        trackingErrorMessageForCode(
          payload.error.code,
          "Couldn't connect to live tracking updates. Try refreshing the page.",
        ),
      );
      setLoadState("error");
    }

    socket.on(PICKUP_JOINED_EVENT, handleJoined);
    socket.on(PICKUP_LOCATION_EVENT, handleLocation);
    socket.on(PICKUP_STATUS_EVENT, handleStatus);
    socket.on(PICKUP_ERROR_EVENT, handleError);

    socket.emit(PICKUP_JOIN_EVENT, { pickupRequestId: pickupId });

    return () => {
      socket.off(PICKUP_JOINED_EVENT, handleJoined);
      socket.off(PICKUP_LOCATION_EVENT, handleLocation);
      socket.off(PICKUP_STATUS_EVENT, handleStatus);
      socket.off(PICKUP_ERROR_EVENT, handleError);
    };
  }, [pickupId]);

  return (
    <PageContainer className="py-8 lg:py-12">
      <h1 className="text-h1 text-neutral-900">Track pickup</h1>
      <p className="mt-2 text-body-lg text-neutral-500">
        Follow your collector&apos;s live location and pickup progress.
      </p>

      {loadState === "loading" && (
        <Card className="mt-8 text-center">
          <p className="text-body-sm text-neutral-500">Loading tracking info…</p>
        </Card>
      )}

      {loadState === "error" && <ErrorBanner className="mt-8">{loadError}</ErrorBanner>}



      {loadState === "ready" && status && (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.5fr]">
          <div className="flex h-full flex-col gap-6">
            {collector && (
              <Card className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Avatar src={resolveAvatarUrl(collector.avatarUrl)} name={collector.fullName} accent="collector" size="lg" />
                  <div>
                    <p className="text-overline text-neutral-500">Your collector</p>
                    <p className="mt-1 text-h4 text-neutral-900">{collector.fullName}</p>
                    <p className="mt-1 text-body-sm text-neutral-500">
                      {collector.vehicleType ? VEHICLE_TYPE_LABELS[collector.vehicleType] : "Vehicle not set"}
                    </p>
                  </div>
                </div>
                {collector.phone ? (
                  <a
                    href={`tel:${collector.phone}`}
                    className="inline-block rounded-lg bg-primary-50 px-4 py-2 text-center text-body-sm font-medium text-primary-600 transition hover:bg-primary-100"
                  >
                    Call {collector.phone}
                  </a>
                ) : (
                  <p className="text-body-sm text-neutral-500">Phone not provided</p>
                )}
              </Card>
            )}

            <Card className="flex flex-1 flex-col">
              {status === "CANCELLED" ? (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <Icon icon={Ban} size="lg" className="text-error-500" aria-hidden />
                  <p className="text-body-sm text-neutral-600">This pickup has been cancelled.</p>
                </div>
              ) : isTimelineStatus(status) ? (
                <StatusTimeline currentStatus={status} />
              ) : (
                <p className="text-body-sm text-neutral-500">
                  Waiting for a collector to be assigned to this pickup.
                </p>
              )}

              {!collectorLocation && status !== "CANCELLED" && (
                <p className="mt-auto pt-6 text-body-sm text-neutral-500">
                  Waiting for your collector to start sharing their location.
                </p>
              )}

              {collectorLocation && (
                <p className="mt-auto pt-6 text-caption text-neutral-500">
                  Last updated {new Date(collectorLocation.updatedAt).toLocaleTimeString()}
                </p>
              )}
            </Card>
          </div>

          <div className="relative overflow-hidden min-h-[400px] w-full lg:min-h-[600px] rounded-xl shadow-sm border border-neutral-200 bg-neutral-50">
            <Map
              center={collectorLocation ?? DHAKA_FALLBACK_CENTER}
              marker={collectorLocation ? { ...collectorLocation, label: "Collector" } : undefined}
              routeOrigin={collectorLocation ?? undefined}
              routeDestination={pickupLocation ?? undefined}
              onRouteCalculated={setRouteInfo}
              className="h-full w-full border-0 rounded-none shadow-none"
            />
            {routeInfo && (
              <div className="absolute top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 rounded-xl bg-white/95 p-4 shadow-lg backdrop-blur-md border border-neutral-200/50">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                    <Icon icon={Clock} size="md" />
                  </div>
                  <div>
                    <p className="text-h4 text-neutral-900">{routeInfo.duration}</p>
                    <p className="text-body-sm text-neutral-500">
                      <Icon icon={Navigation} size="sm" className="inline mr-1 align-text-bottom" />
                      {routeInfo.distance} away
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
