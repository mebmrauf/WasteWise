"use client";

import * as React from "react";
import { Ban, Clock, Navigation } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ChatWidget } from "@/components/ChatWidget";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Icon } from "@/components/Icon";
import { Map } from "@/components/Map";
import { StatusTimeline, type PickupTrackingStatus } from "@/components/StatusTimeline";
import { AuthApiError } from "@/lib/api/auth";
import {
  getPickupDetail,
  getPickupTracking,
  type CollectorLocation,
  type PickupStatus,
  type TrackedCollector,
  type PickupRequestDetail,
  type PickupRequestSummary,
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
  PICKUP_ACCEPT_WEIGHTS_EVENT,
  PICKUP_REJECT_WEIGHTS_EVENT,
  type PickupErrorPayload,
  type PickupJoinedPayload,
  type PickupLocationPayload,
  type PickupStatusPayload,
} from "@/lib/socket";

const DHAKA_FALLBACK_CENTER = { lat: 23.8103, lng: 90.4125 };

const STATUSES_ON_TIMELINE: readonly PickupStatus[] = ["ASSIGNED", "EN_ROUTE", "ARRIVED", "VERIFYING_WEIGHTS", "COMPLETED"];

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

export function TrackPickupPanel({
  pickupSummary,
  onCompleted,
}: {
  pickupSummary: PickupRequestSummary;
  onCompleted?: () => void;
}) {
  const [loadState, setLoadState] = React.useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [status, setStatus] = React.useState<PickupStatus>(pickupSummary.status);
  const [pickupDetail, setPickupDetail] = React.useState<PickupRequestDetail | null>(null);
  const [collectorLocation, setCollectorLocation] = React.useState<CollectorLocation | null>(null);
  const [pickupLocation, setPickupLocation] = React.useState<{ lat: number; lng: number } | null>(null);
  const [collector, setCollector] = React.useState<TrackedCollector | null>(null);
  const [routeInfo, setRouteInfo] = React.useState<{ distance: string; duration: string } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    setLoadError(null);

    getPickupTracking(pickupSummary.id)
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

    getPickupDetail(pickupSummary.id)
      .then((res) => {
        if (!cancelled) setPickupDetail(res.pickup);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [pickupSummary.id]);

  React.useEffect(() => {
    if (status === "VERIFYING_WEIGHTS" || status === "COMPLETED") {
      getPickupDetail(pickupSummary.id)
        .then((res) => setPickupDetail(res.pickup))
        .catch(() => {});
    }
  }, [status, pickupSummary.id]);

  React.useEffect(() => {
    const socket = getTrackingSocket();

    function handleJoined(payload: PickupJoinedPayload) {
      if (payload.pickupRequestId !== pickupSummary.id) return;
    }

    function handleLocation(payload: PickupLocationPayload) {
      if (payload.pickupRequestId !== pickupSummary.id) return;
      setCollectorLocation({ lat: payload.lat, lng: payload.lng, updatedAt: payload.updatedAt });
    }

    function handleStatus(payload: PickupStatusPayload) {
      if (payload.pickupRequestId !== pickupSummary.id) return;
      setStatus(payload.status);
      if (payload.status === "COMPLETED") {
        onCompleted?.();
      }
    }

    function handleError(payload: PickupErrorPayload) {
      if (payload.event !== PICKUP_JOIN_EVENT) return;
      if (payload.pickupRequestId && payload.pickupRequestId !== pickupSummary.id) return;
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

    socket.emit(PICKUP_JOIN_EVENT, { pickupRequestId: pickupSummary.id });

    return () => {
      socket.off(PICKUP_JOINED_EVENT, handleJoined);
      socket.off(PICKUP_LOCATION_EVENT, handleLocation);
      socket.off(PICKUP_STATUS_EVENT, handleStatus);
      socket.off(PICKUP_ERROR_EVENT, handleError);
    };
  }, [pickupSummary.id, onCompleted]);

  if (loadState === "loading") {
    return <div className="py-8 text-center text-body-sm text-neutral-500">Loading tracking info…</div>;
  }

  if (loadState === "error") {
    return <ErrorBanner className="mt-4">{loadError}</ErrorBanner>;
  }

  return (
    <div className="mt-6 pt-6 border-t border-neutral-100 flex flex-col gap-6 animate-slide-up">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-1 flex-col gap-4">
          {collector && (
            <Card className="flex flex-col gap-4 bg-white/50 border border-neutral-100 shadow-sm">
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

          <Card className="flex flex-1 flex-col bg-white/50 border border-neutral-100 shadow-sm">
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
                Last updated {new Date(collectorLocation.updatedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true })}
              </p>
            )}
          </Card>

          {status === "VERIFYING_WEIGHTS" && pickupDetail && (
            <Card className="flex flex-col gap-4 mt-2 bg-primary-50/50 border-primary-100">
              <h3 className="text-h4 text-neutral-900">Verify Final Weights</h3>
              <p className="text-body-sm text-neutral-600">
                The collector has entered the exact weights. Please verify and accept to complete the pickup.
              </p>
              <div className="flex flex-col gap-2">
                {pickupDetail.items.map(item => {
                   const bid = pickupDetail.bidAmountsPerKg?.[item.category] ?? 0;
                   const total = item.exactWeightKg ? item.exactWeightKg * bid : 0;
                   return (
                      <div key={item.category} className="flex justify-between text-body-sm">
                        <span className="text-neutral-700">{item.category} ({item.exactWeightKg}kg x ৳{bid.toLocaleString("en-US")}/kg)</span>
                        <span className="font-data text-neutral-900">৳{total.toLocaleString("en-US")}</span>
                      </div>
                   )
                })}
                <div className="flex justify-between text-body font-bold border-t border-primary-200 pt-2 mt-1">
                  <span>Total</span>
                  <span className="font-data">
                    ৳{pickupDetail.items.reduce((sum, item) => sum + ((item.exactWeightKg || 0) * (pickupDetail.bidAmountsPerKg?.[item.category] || 0)), 0).toLocaleString("en-US")}
                  </span>
                </div>
              </div>
              {status === "VERIFYING_WEIGHTS" && (
                <div className="flex justify-end gap-3 mt-2">
                  <Button variant="secondary" onClick={() => getTrackingSocket().emit(PICKUP_REJECT_WEIGHTS_EVENT, { pickupRequestId: pickupSummary.id })}>Reject</Button>
                  <Button variant="primary" onClick={() => getTrackingSocket().emit(PICKUP_ACCEPT_WEIGHTS_EVENT, { pickupRequestId: pickupSummary.id })}>Accept & Complete</Button>
                </div>
              )}
            </Card>
          )}
        </div>

          <div className="flex flex-col gap-4 w-full lg:w-[400px] shrink-0">
            {status !== "COMPLETED" && (
              <div className="relative overflow-hidden min-h-[300px] rounded-xl shadow-sm border border-neutral-200 bg-neutral-50">
                <Map
                  center={collectorLocation ?? DHAKA_FALLBACK_CENTER}
                  marker={collectorLocation ? { ...collectorLocation, label: "Collector" } : undefined}
                  routeOrigin={collectorLocation ?? undefined}
                  routeDestination={pickupLocation ?? undefined}
                  onRouteCalculated={setRouteInfo}
                  className="h-full w-full border-0 rounded-none shadow-none"
                />
                {routeInfo && (
                  <div className="absolute top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-64 rounded-xl bg-white/95 p-4 shadow-lg backdrop-blur-md border border-neutral-200/50">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                        <Icon icon={Clock} size="sm" />
                      </div>
                      <div>
                        <p className="text-body font-bold text-neutral-900">{routeInfo.duration}</p>
                        <p className="text-caption text-neutral-500">
                          <Icon icon={Navigation} size="sm" className="inline mr-1 align-text-bottom" />
                          {routeInfo.distance} away
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {collector && (
              <ChatWidget
                targetUserId={collector.id}
                targetUserName={collector.fullName}
                isActive={status !== "COMPLETED" && status !== "CANCELLED"}
                className="mt-2 flex-1"
              />
            )}
          </div>
      </div>
    </div>
  );
}
