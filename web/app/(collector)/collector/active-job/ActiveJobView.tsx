"use client";

import * as React from "react";
import { Ban, Compass, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CategoryQuantityRow } from "@/components/CategoryQuantityRow";
import { ErrorBanner } from "@/components/ErrorBanner";
import { formatTimeSlot } from "@/components/AvailableJobListItem";
import { Icon } from "@/components/Icon";
import { PageContainer } from "@/components/PageContainer";
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

export function ActiveJobView() {
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
    <PageContainer className="py-8 lg:py-12">
      <h1 className="text-h1 text-neutral-900">Active Job</h1>
      <p className="mt-2 text-body-lg text-neutral-500">
        Track your current assignment, share your live location, and update its status.
      </p>

      {loadState === "loading" && (
        <Card className="mt-8 text-center">
          <p className="text-body-sm text-neutral-500">Loading your active job…</p>
        </Card>
      )}

      {loadState === "error" && <ErrorBanner className="mt-8">{loadError}</ErrorBanner>}

      {loadState === "ready" && jobs.length === 0 && (
        <Card className="mt-8 flex flex-col items-center gap-3 py-10 text-center">
          <Icon icon={Compass} size="lg" className="text-neutral-400" aria-hidden />
          <div>
            <p className="text-h4 text-neutral-900">No active job</p>
            <p className="mt-1 max-w-md text-body-sm text-neutral-500">
              Once one of your bids is accepted, the job will show up here with live tracking
              controls.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button href="/collector/jobs">Browse available jobs</Button>
            {}
            <Button variant="secondary" onClick={() => void fetchJobs()}>
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
    </PageContainer>
  );
}

const STATUS_SEQUENCE: PickupStatus[] = ["ASSIGNED", "EN_ROUTE", "ARRIVED", "COMPLETED"];

function nextStatusInSequence(current: PickupStatus): PickupStatus | null {
  const index = STATUS_SEQUENCE.indexOf(current);
  if (index === -1 || index === STATUS_SEQUENCE.length - 1) return null;
  return STATUS_SEQUENCE[index + 1];
}

function isTimelineStatus(status: PickupStatus): status is PickupTrackingStatus {
  return status === "ASSIGNED" || status === "EN_ROUTE" || status === "ARRIVED" || status === "COMPLETED";
}

const MIN_EMIT_INTERVAL_MS = 5000;
const MIN_EMIT_DISTANCE_METERS = 25;

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
  const [advancing, setAdvancing] = React.useState(false);
  const [statusError, setStatusError] = React.useState<string | null>(null);

  const [sharing, setSharing] = React.useState(false);
  const [geoError, setGeoError] = React.useState<string | null>(null);
  const [lastSharedAt, setLastSharedAt] = React.useState<string | null>(null);

  const watchIdRef = React.useRef<number | null>(null);
  const lastEmitRef = React.useRef<{ at: number; lat: number; lng: number } | null>(null);

  const stopSharing = React.useCallback(() => {
    if (watchIdRef.current != null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    setSharing(false);
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
        setGeoError(geolocationErrorMessage(err));
        stopSharing();
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
    watchIdRef.current = watchId;
    setSharing(true);
  }, [job.id, stopSharing]);

  React.useEffect(() => {
    const socket = getTrackingSocket();

    function handleStatus(payload: PickupStatusPayload) {
      if (payload.pickupRequestId !== job.id) return;
      setStatus(payload.status);
      setAdvancing(false);
      if (payload.status === "COMPLETED") {
        stopSharing();
        onCompleted(job.id);
      }
    }

    function handleLocation(payload: PickupLocationPayload) {
      if (payload.pickupRequestId !== job.id) return;
      setLastSharedAt(payload.updatedAt);
    }

    function handleError(payload: PickupErrorPayload) {
      if (payload.pickupRequestId && payload.pickupRequestId !== job.id) return;
      if (payload.event === PICKUP_STATUS_UPDATE_EVENT) {
        setAdvancing(false);
        setStatusError(resolveSocketErrorMessage(payload.error.code));
      } else if (payload.event === PICKUP_LOCATION_UPDATE_EVENT) {
        setGeoError(resolveSocketErrorMessage(payload.error.code));
      }
    }

    socket.on(PICKUP_STATUS_EVENT, handleStatus);
    socket.on(PICKUP_LOCATION_EVENT, handleLocation);
    socket.on(PICKUP_ERROR_EVENT, handleError);
    socket.emit(PICKUP_JOIN_EVENT, { pickupRequestId: job.id });

    return () => {
      socket.off(PICKUP_STATUS_EVENT, handleStatus);
      socket.off(PICKUP_LOCATION_EVENT, handleLocation);
      socket.off(PICKUP_ERROR_EVENT, handleError);
    };
  }, [job.id, onCompleted, stopSharing]);

  React.useEffect(() => {
    return () => {
      if (watchIdRef.current != null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  function handleAdvanceStatus() {
    const next = nextStatusInSequence(status);
    if (!next) return;
    setStatusError(null);
    setAdvancing(true);
    getTrackingSocket().emit(PICKUP_STATUS_UPDATE_EVENT, { pickupRequestId: job.id, status: next });
  }

  const nextStatus = nextStatusInSequence(status);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
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

      <div className="flex flex-col gap-3 border-t border-neutral-200 pt-4">
        <h2 className="text-h4 text-neutral-900">Live location sharing</h2>
        {geoError && <ErrorBanner>{geoError}</ErrorBanner>}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={sharing ? "secondary" : "primary"}
            size="sm"
            onClick={() => (sharing ? stopSharing() : startSharing())}
          >
            <Icon icon={Navigation} size="sm" aria-hidden />
            {sharing ? "Stop sharing location" : "Start sharing location"}
          </Button>
          {sharing && (
            <p className="text-caption text-neutral-500">
              {lastSharedAt
                ? `Last shared ${new Date(lastSharedAt).toLocaleTimeString()}`
                : "Waiting for your first location update…"}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-neutral-200 pt-4">
        <h2 className="text-h4 text-neutral-900">Update status</h2>
        {statusError && <ErrorBanner>{statusError}</ErrorBanner>}
        <div className="flex justify-end">
          <Button size="sm" disabled={!nextStatus || advancing} onClick={handleAdvanceStatus}>
            {advancing ? "Updating…" : nextStatus ? `Mark as ${PICKUP_STATUS_LABEL[nextStatus]}` : "Job completed"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
