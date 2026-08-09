"use client";

import * as React from "react";
import { Ban, Compass, MapPin, Navigation, Scale } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CategoryQuantityRow } from "@/components/CategoryQuantityRow";
import { ErrorBanner } from "@/components/ErrorBanner";
import { formatTimeSlot } from "@/components/AvailableJobListItem";
import { Icon } from "@/components/Icon";
import { Input } from "@/components/Input";

import { StatusPill } from "@/components/StatusPill";
import { StatusTimeline, type PickupTrackingStatus } from "@/components/StatusTimeline";
import { SummaryRow } from "@/components/SummaryPanel";
import { AuthApiError } from "@/lib/api/auth";
import {
  listAssignedPickups,
  LOAD_SIZE_LABELS,
  formatKgRange,
  type PickupRequestSummary,
  type PickupStatus,
} from "@/lib/api/pickups";
import { PICKUP_STATUS_TONE, PICKUP_STATUS_LABEL } from "@/lib/pickupStatus";
import {
  getTrackingSocket,
  PICKUP_ERROR_EVENT,
  PICKUP_JOIN_EVENT,
  PICKUP_LOCATION_EVENT,
  PICKUP_LOCATION_UPDATE_EVENT,
  PICKUP_STATUS_EVENT,
  PICKUP_STATUS_UPDATE_EVENT,
  PICKUP_SUBMIT_WEIGHTS_EVENT,
  type PickupErrorPayload,
  type PickupLocationPayload,
  type PickupStatusPayload,
} from "@/lib/socket";

type LoadState = "loading" | "ready" | "error";

const loadErrorMessages: Record<string, string> = {
  FORBIDDEN: "You don't have access to this page.",
};

function resolveLoadErrorMessage(err: unknown): string {
  if (err instanceof AuthApiError) {
    return loadErrorMessages[err.code] ?? "Couldn't load your active job. Try refreshing the page.";
  }
  return "Something went wrong loading your active job. Try refreshing the page.";
}

export function ActiveJobTracker() {
  const [loadState, setLoadState] = React.useState<LoadState>("loading");
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [jobs, setJobs] = React.useState<PickupRequestSummary[]>([]);

  const fetchJobs = React.useCallback(() => {
    setLoadState("loading");
    setLoadError(null);
    return listAssignedPickups()
      .then(({ pickups }) => {
        setJobs(pickups);
        setLoadState("ready");
      })
      .catch((err: unknown) => {
        setLoadError(resolveLoadErrorMessage(err));
        setLoadState("error");
      });
  }, []);

  React.useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  React.useEffect(() => {
    function handleFocusOrVisible() {
      if (document.visibilityState !== "visible") return;
      listAssignedPickups()
        .then(({ pickups }) => setJobs(pickups))
        .catch(() => {
        });
    }
    document.addEventListener("visibilitychange", handleFocusOrVisible);
    window.addEventListener("focus", handleFocusOrVisible);
    return () => {
      document.removeEventListener("visibilitychange", handleFocusOrVisible);
      window.removeEventListener("focus", handleFocusOrVisible);
    };
  }, []);

  const handleJobCompleted = React.useCallback((pickupId: string) => {
    setJobs((prev) => prev.filter((job) => job.id !== pickupId));
  }, []);

  return (
    <div className="w-full mb-12">
      {loadState === "loading" && (
        <Card className="glass-panel border-0 shadow-sm mt-8 text-center p-8">
          <p className="text-body-sm text-neutral-500">Loading your active job…</p>
        </Card>
      )}

      {loadState === "error" && <ErrorBanner className="mt-8">{loadError}</ErrorBanner>}

      {loadState === "ready" && jobs.length === 0 && (
        <Card className="glass-panel mt-8 flex flex-col items-center gap-4 py-16 text-center shadow-lg border-0 rounded-2xl">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-primary-600">
            <Icon icon={Compass} size="lg" aria-hidden />
          </div>
          <div>
            <p className="font-heading text-h3 text-neutral-900">No active job</p>
            <p className="mt-2 text-body-lg text-neutral-500 max-w-sm mx-auto">
              Once one of your bids is accepted, the job will show up here with live tracking controls.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            <Button href="/collector/jobs" className="px-8">Browse available jobs</Button>
            <Button variant="secondary" onClick={() => void fetchJobs()} className="px-8">
              Check for updates
            </Button>
          </div>
        </Card>
      )}

      {loadState === "ready" && jobs.length > 0 && (
        <div className="mt-8 flex flex-col gap-6">
          {jobs.map((job) => (
            <ActiveJobCard key={job.id} job={job} onCompleted={handleJobCompleted} />
          ))}
        </div>
      )}
    </div>
  );
}

const STATUS_SEQUENCE: PickupStatus[] = ["ASSIGNED", "EN_ROUTE"];

function nextStatusInSequence(current: PickupStatus): PickupStatus | null {
  const index = STATUS_SEQUENCE.indexOf(current);
  if (index === -1 || index === STATUS_SEQUENCE.length - 1) return null;
  return STATUS_SEQUENCE[index + 1];
}

function isTimelineStatus(status: PickupStatus): status is PickupTrackingStatus {
  return status === "ASSIGNED" || status === "EN_ROUTE" || status === "ARRIVED" || status === "VERIFYING_WEIGHTS" || status === "COMPLETED";
}

const MIN_EMIT_INTERVAL_MS = 2000;
const MIN_EMIT_DISTANCE_METERS = 5;

function haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const EARTH_RADIUS_METERS = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

function geolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location permission was denied. Enable location access for this site in your browser settings to share your position.";
    case error.POSITION_UNAVAILABLE:
      return "Your location is currently unavailable right now. Try again in a moment.";
    case error.TIMEOUT:
      return "Getting your location timed out. Try again.";
    default:
      return "Couldn't get your location. Try again.";
  }
}

const socketErrorMessages: Record<string, string> = {
  FORBIDDEN: "You're not authorized to update this pickup.",
  NOT_FOUND: "This pickup no longer exists.",
  VALIDATION_ERROR: "That update was rejected — this pickup may already be in a final state.",
  COLLECTOR_PROFILE_NOT_FOUND: "Your collector profile couldn't be found. Contact support.",
};

function resolveSocketErrorMessage(code: string): string {
  return socketErrorMessages[code] ?? "That update was rejected by the server.";
}

function ActiveJobCard({
  job,
  onCompleted,
}: {
  job: PickupRequestSummary;
  onCompleted: (pickupId: string) => void;
}) {
  const [status, setStatus] = React.useState<PickupStatus>(job.status);
  const statusRef = React.useRef<PickupStatus>(job.status);
  React.useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const [advancing, setAdvancing] = React.useState(false);
  const [submittingWeights, setSubmittingWeights] = React.useState(false);
  const [exactWeights, setExactWeights] = React.useState<Record<string, string>>({});
  const [statusError, setStatusError] = React.useState<string | null>(null);

  const [geoError, setGeoError] = React.useState<string | null>(null);

  const [canMarkEnRoute, setCanMarkEnRoute] = React.useState(true);

  React.useEffect(() => {
    const pickupDate = new Date(job.timeSlotStart);
    const today = new Date();
    const pickupDay = new Date(pickupDate.getFullYear(), pickupDate.getMonth(), pickupDate.getDate());
    const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    setCanMarkEnRoute(currentDay.getTime() >= pickupDay.getTime());
  }, [job.timeSlotStart]);

  const watchIdRef = React.useRef<number | null>(null);
  const lastEmitRef = React.useRef<{ at: number; lat: number; lng: number } | null>(null);

  const stopSharing = React.useCallback(() => {
    if (watchIdRef.current != null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
  }, []);

  const startSharing = React.useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Geolocation isn't supported by this browser.");
      return;
    }
    setGeoError(null);
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        if (statusRef.current === "EN_ROUTE") {
          const distanceToUser = haversineDistanceMeters(latitude, longitude, job.latitude, job.longitude);
          if (distanceToUser <= 50) {
            getTrackingSocket().emit(PICKUP_STATUS_UPDATE_EVENT, { pickupRequestId: job.id, status: "ARRIVED" });
          }
        }

        const now = Date.now();
        const last = lastEmitRef.current;
        const shouldEmit =
          !last ||
          now - last.at >= MIN_EMIT_INTERVAL_MS ||
          haversineDistanceMeters(last.lat, last.lng, latitude, longitude) >= MIN_EMIT_DISTANCE_METERS;
        if (!shouldEmit) return;

        lastEmitRef.current = { at: now, lat: latitude, lng: longitude };
        getTrackingSocket().emit(PICKUP_LOCATION_UPDATE_EVENT, {
          pickupRequestId: job.id,
          lat: latitude,
          lng: longitude,
        });
      },
      (err) => {
        if (err.code === err.TIMEOUT) {
          setGeoError("Still trying to determine your precise location (GPS signal weak)...");
          return;
        }
        setGeoError(geolocationErrorMessage(err));
        stopSharing();
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
    watchIdRef.current = watchId;
  }, [job.id, job.latitude, job.longitude, stopSharing]);

  React.useEffect(() => {
    const socket = getTrackingSocket();

    function handleStatus(payload: PickupStatusPayload) {
      if (payload.pickupRequestId !== job.id) return;
      setStatus(payload.status);
      setAdvancing(false);
      setSubmittingWeights(false);
      if (payload.status === "COMPLETED") {
        onCompleted(job.id);
      }
    }

    function handleError(payload: PickupErrorPayload) {
      if (payload.pickupRequestId && payload.pickupRequestId !== job.id) return;
      if (payload.event === PICKUP_STATUS_UPDATE_EVENT || payload.event === PICKUP_SUBMIT_WEIGHTS_EVENT) {
        setAdvancing(false);
        setSubmittingWeights(false);
        setStatusError(resolveSocketErrorMessage(payload.error.code));
      } else if (payload.event === PICKUP_LOCATION_UPDATE_EVENT) {
        setGeoError(resolveSocketErrorMessage(payload.error.code));
      }
    }

    socket.on(PICKUP_STATUS_EVENT, handleStatus);
    socket.on(PICKUP_ERROR_EVENT, handleError);
    socket.emit(PICKUP_JOIN_EVENT, { pickupRequestId: job.id });

    return () => {
      socket.off(PICKUP_STATUS_EVENT, handleStatus);
      socket.off(PICKUP_ERROR_EVENT, handleError);
    };
  }, [job.id, onCompleted]);

  React.useEffect(() => {
    if (status === "EN_ROUTE") {
      startSharing();
    } else {
      stopSharing();
    }
    return () => {
      stopSharing();
    };
  }, [status, startSharing, stopSharing]);

  function handleAdvanceStatus() {
    const next = nextStatusInSequence(status);
    if (!next) return;
    setStatusError(null);
    setAdvancing(true);
    getTrackingSocket().emit(PICKUP_STATUS_UPDATE_EVENT, { pickupRequestId: job.id, status: next });
  }

  function handleSubmitWeights() {
    const weights: Record<string, number> = {};
    for (const item of job.items) {
      const raw = exactWeights[item.category] ?? "";
      const num = Number(raw);
      if (!raw.trim() || !Number.isFinite(num) || num <= 0) {
        setStatusError(`Enter a valid weight for ${item.category}.`);
        return;
      }
      weights[item.category] = num;
    }
    setStatusError(null);
    setSubmittingWeights(true);
    getTrackingSocket().emit(PICKUP_SUBMIT_WEIGHTS_EVENT, { pickupRequestId: job.id, weights });
  }

  const nextStatus = nextStatusInSequence(status);

  return (
    <Card className="glass-panel border-0 shadow-lg flex flex-col gap-4 rounded-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3 p-2">
        <div className="flex items-center gap-2 text-body-sm text-neutral-700">
          <Icon icon={MapPin} size="sm" className="text-neutral-500" aria-hidden />
          <span>{job.pickupFormattedAddress}</span>
        </div>
        <StatusPill tone={PICKUP_STATUS_TONE[status]}>{PICKUP_STATUS_LABEL[status]}</StatusPill>
      </div>

      {isTimelineStatus(status) ? (
        <StatusTimeline currentStatus={status} />
      ) : (
        <div className="flex flex-col items-center gap-2 py-2 text-center">
          <Icon icon={Ban} size="md" className="text-error-500" aria-hidden />
          <p className="text-body-sm text-neutral-600">This pickup was cancelled.</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {job.items.map((item) => (
          <CategoryQuantityRow
            key={item.id}
            category={item.category}
            quantityLabel={`${LOAD_SIZE_LABELS[item.loadSize]} (${formatKgRange(item.loadSize)})`}
          />
        ))}
      </div>

      <SummaryRow label="Window" value={formatTimeSlot(job.timeSlotStart, job.timeSlotEnd)} />

      {geoError && (
        <div className="flex flex-col gap-3 border-t border-neutral-200 pt-4">
          <ErrorBanner>{geoError}</ErrorBanner>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-neutral-200 pt-4">
        <h2 className="text-h4 text-neutral-900">Update status</h2>
        {statusError && <ErrorBanner>{statusError}</ErrorBanner>}
        
        {status === "VERIFYING_WEIGHTS" ? (
          <p className="text-body-sm text-neutral-500 italic text-center py-4">Waiting for household to verify weights...</p>
        ) : status === "ARRIVED" ? (
          <div className="flex flex-col gap-5 mt-4">
            <div className="bg-primary-50/50 border border-primary-100 p-5 rounded-2xl flex flex-col gap-5">
              <div className="flex items-center gap-3 border-b border-primary-100/50 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                  <Icon icon={Scale} size="sm" />
                </div>
                <div>
                  <h3 className="text-body-lg font-semibold text-neutral-900 leading-tight">Weigh items</h3>
                  <p className="text-body-sm text-neutral-600">Enter the exact weight (KG) of each item collected.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {job.items.map((item) => (
                  <Input
                    key={item.category}
                    label={`${item.category} Weight (KG)`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    placeholder="0.0"
                    className="bg-white"
                    value={exactWeights[item.category] ?? ""}
                    onChange={(e) => setExactWeights(prev => ({ ...prev, [item.category]: e.target.value }))}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center mt-2">
              <Button variant="ghost" size="sm" onClick={() => getTrackingSocket().emit(PICKUP_STATUS_UPDATE_EVENT, { pickupRequestId: job.id, status: "EN_ROUTE" })}>
                Back to En Route
              </Button>
              <Button size="sm" disabled={submittingWeights} onClick={handleSubmitWeights}>
                {submittingWeights ? "Submitting..." : "Submit weights"}
              </Button>
            </div>
          </div>
        ) : status === "EN_ROUTE" ? (
          <div className="flex flex-col gap-4 py-4">
            <p className="text-body-sm text-neutral-500 italic text-center">Driving to destination... Location is updating automatically.</p>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => {
                setStatusError(null);
                setAdvancing(true);
                getTrackingSocket().emit(PICKUP_STATUS_UPDATE_EVENT, { pickupRequestId: job.id, status: "ARRIVED" });
              }}>
                Mark as Arrived
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-2">
            {nextStatus === "EN_ROUTE" && !canMarkEnRoute && (
              <p className="text-body-sm text-neutral-500 text-right">
                You can only start this job on the scheduled pickup date ({new Date(job.timeSlotStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}).
              </p>
            )}
            <Button 
              size="sm" 
              disabled={!nextStatus || advancing || (nextStatus === "EN_ROUTE" && !canMarkEnRoute)} 
              onClick={handleAdvanceStatus}
            >
              {advancing ? "Updating…" : nextStatus ? `Mark as ${PICKUP_STATUS_LABEL[nextStatus]}` : "Job completed"}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
