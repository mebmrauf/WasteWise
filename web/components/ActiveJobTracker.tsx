"use client";

import * as React from "react";
import { Ban, Clock, Compass, MapPin, Navigation, Scale, Package, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/Button";
import { CollectorEmptyState } from "@/components/CollectorEmptyState";
import { ErrorBanner } from "@/components/ErrorBanner";
import { formatDate } from "@/components/AvailableJobListItem";
import { Icon } from "@/components/Icon";
import { Input } from "@/components/Input";
import { Map as MapView } from "@/components/Map";
import { AuthApiError } from "@/lib/api/auth";
import {
  listAssignedPickups,
  formatEstimatedWeightRange,
  type PickupRequestSummary,
  type PickupStatus,
} from "@/lib/api/pickups";
import { getActiveRoute } from "@/lib/api/routes";
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
  const [routeSequenceByPickupId, setRouteSequenceByPickupId] = React.useState<Map<string, number> | null>(null);
  const [routeStopsTotal, setRouteStopsTotal] = React.useState(0);

  const loadJobs = React.useCallback(() => {
    return Promise.all([listAssignedPickups(), getActiveRoute().catch(() => ({ routePlan: null }))]).then(
      ([{ pickups }, { routePlan }]) => {
        const queuedStops = routePlan?.stops.filter((s) => s.status === "QUEUED") ?? [];
        const sequenceByPickupId = new Map(queuedStops.map((s) => [s.pickup.id, s.sequence]));
        setRouteSequenceByPickupId(sequenceByPickupId.size > 0 ? sequenceByPickupId : null);
        setRouteStopsTotal(routePlan?.stops.length || 0); // Include completed for total count
        setJobs(
          [...pickups].sort((a, b) => {
            const seqA = sequenceByPickupId.get(a.id);
            const seqB = sequenceByPickupId.get(b.id);
            if (seqA != null && seqB != null) return seqA - seqB;
            if (seqA != null) return -1;
            if (seqB != null) return 1;
            return 0;
          }),
        );
      },
    );
  }, []);

  const fetchJobs = React.useCallback(() => {
    setLoadState("loading");
    setLoadError(null);
    return loadJobs()
      .then(() => setLoadState("ready"))
      .catch((err: unknown) => {
        setLoadError(resolveLoadErrorMessage(err));
        setLoadState("error");
      });
  }, [loadJobs]);

  React.useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  React.useEffect(() => {
    function handleFocusOrVisible() {
      if (document.visibilityState !== "visible") return;
      void loadJobs().catch(() => {});
    }
    document.addEventListener("visibilitychange", handleFocusOrVisible);
    window.addEventListener("focus", handleFocusOrVisible);
    return () => {
      document.removeEventListener("visibilitychange", handleFocusOrVisible);
      window.removeEventListener("focus", handleFocusOrVisible);
    };
  }, [loadJobs]);

  const handleJobCompleted = React.useCallback((pickupId: string) => {
    setJobs((prev) => prev.filter((job) => job.id !== pickupId));
  }, []);

  if (loadState === "loading") {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-neutral-200 w-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16A34A] mb-4"></div>
        <p className="text-sm font-medium text-neutral-500">Loading your active job…</p>
      </div>
    );
  }

  if (loadState === "error") {
    return <ErrorBanner className="mt-8">{loadError}</ErrorBanner>;
  }

  if (loadState === "ready" && jobs.length === 0) {
    return (
      <CollectorEmptyState
        icon={Compass}
        title="No active job"
        description="Once one of your bids is accepted, the job will show up here with live tracking controls."
      >
        <Button href="/collector/jobs" className="px-8 bg-[#16A34A] hover:bg-[#15803d] text-white border-0">Browse available jobs</Button>
        <Button variant="secondary" onClick={() => void fetchJobs()} className="px-8 border-neutral-200">
          Check for updates
        </Button>
      </CollectorEmptyState>
    );
  }

  // Determine current hero job and others
  const inProgressStatuses = ["EN_ROUTE", "ARRIVED", "VERIFYING_WEIGHTS"];
  let currentJob = jobs.find(j => inProgressStatuses.includes(j.status));
  if (!currentJob) {
    // fallback to first assigned job in route
    currentJob = jobs.find(j => j.status === "ASSIGNED" && routeSequenceByPickupId?.has(j.id)) || jobs[0];
  }

  const upcomingRouteJobs = jobs.filter(j => j.id !== currentJob?.id && routeSequenceByPickupId?.has(j.id));
  const otherJobs = jobs.filter(j => j.id !== currentJob?.id && !routeSequenceByPickupId?.has(j.id));

  return (
    <div className="w-full flex flex-col gap-8 pb-12">
      {currentJob && (
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Current Stop</h2>
          <ActiveJobCard
            job={currentJob}
            onCompleted={handleJobCompleted}
            routeBadge={routeSequenceByPickupId?.has(currentJob.id) ? { sequence: routeSequenceByPickupId.get(currentJob.id)!, total: routeStopsTotal } : null}
            isHero={true}
          />
        </div>
      )}

      {upcomingRouteJobs.length > 0 && (
        <div className="flex flex-col gap-4 mt-4">
          <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Next Up</h2>
          <div className="flex flex-col gap-3">
            {upcomingRouteJobs.map(job => (
              <ActiveJobCard
                key={job.id}
                job={job}
                onCompleted={handleJobCompleted}
                routeBadge={routeSequenceByPickupId?.has(job.id) ? { sequence: routeSequenceByPickupId.get(job.id)!, total: routeStopsTotal } : null}
                isHero={false}
              />
            ))}
          </div>
        </div>
      )}

      {otherJobs.length > 0 && (
        <div className="flex flex-col gap-4 mt-8 pt-8 border-t border-neutral-200">
          <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Other Assigned Pickups</h2>
          <div className="flex flex-col gap-3 opacity-80 hover:opacity-100 transition-opacity">
            {otherJobs.map(job => (
              <ActiveJobCard
                key={job.id}
                job={job}
                onCompleted={handleJobCompleted}
                routeBadge={null}
                isHero={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS_SEQUENCE: PickupStatus[] = ["ASSIGNED", "EN_ROUTE", "ARRIVED"];

function nextStatusInSequence(current: PickupStatus): PickupStatus | null {
  const index = STATUS_SEQUENCE.indexOf(current);
  if (index === -1 || index === STATUS_SEQUENCE.length - 1) return null;
  return STATUS_SEQUENCE[index + 1];
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
  routeBadge,
  isHero,
}: {
  job: PickupRequestSummary;
  onCompleted: (pickupId: string) => void;
  routeBadge?: { sequence: number; total: number } | null;
  isHero: boolean;
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
  const [myLocation, setMyLocation] = React.useState<{ lat: number; lng: number } | null>(null);
  const [routeInfo, setRouteInfo] = React.useState<{ distance: string; duration: string } | null>(null);

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
        setMyLocation({ lat: latitude, lng: longitude });

        if (statusRef.current === "EN_ROUTE") {
          const distanceToUser = haversineDistanceMeters(latitude, longitude, job.latitude || 0, job.longitude || 0);
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

  if (!isHero) {
    // Compact View for Queue
    return (
      <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          {routeBadge ? (
            <div className="flex shrink-0 items-center justify-center w-8 h-8 rounded-full font-bold text-sm bg-neutral-100 text-neutral-500">
              {routeBadge.sequence < 10 ? `0${routeBadge.sequence}` : routeBadge.sequence}
            </div>
          ) : (
            <div className="flex shrink-0 items-center justify-center w-8 h-8 rounded-full font-bold text-sm bg-neutral-100 text-neutral-500">
              -
            </div>
          )}
          
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-[#1A1A1A] truncate">{job.pickupFormattedAddress.split(',')[0]}</h3>
            <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
              <span>{job.items.map(i => i.category).join(" · ")}</span>
              {formatEstimatedWeightRange(job.estimatedMinKg, job.estimatedMaxKg) && (
                <>
                  <span>•</span>
                  <span>{formatEstimatedWeightRange(job.estimatedMinKg, job.estimatedMaxKg)}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        {status === "ASSIGNED" && nextStatus && (
          <Button 
            variant="ghost"
            size="sm"
            onClick={handleAdvanceStatus}
            disabled={advancing}
            className="text-[#16A34A] hover:bg-[#16A34A]/10 text-xs font-bold"
          >
            {advancing ? "..." : `Start`}
          </Button>
        )}
      </div>
    );
  }

  // Hero View for Current Job
  return (
    <div className="bg-white border border-neutral-200 shadow-sm flex flex-col rounded-xl overflow-hidden">
      {/* Header Info */}
      <div className="p-5 md:p-6 flex flex-col md:flex-row items-start justify-between gap-4 border-b border-neutral-100">
        <div className="flex items-start gap-4">
          {routeBadge && (
            <div className="flex shrink-0 mt-1 items-center justify-center w-10 h-10 rounded-full font-bold text-base bg-[#1A1A1A] text-white">
              {routeBadge.sequence < 10 ? `0${routeBadge.sequence}` : routeBadge.sequence}
            </div>
          )}
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-[#1A1A1A]">{job.pickupFormattedAddress.split(',')[0]}</h1>
            <p className="text-sm text-neutral-500 mt-1">{job.pickupFormattedAddress}</p>
            <div className="flex items-center gap-3 mt-3">
              <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide ${
                status === "EN_ROUTE" ? "bg-[#EA580C]/10 text-[#EA580C]" :
                status === "ARRIVED" || status === "VERIFYING_WEIGHTS" ? "bg-[#16A34A]/10 text-[#16A34A]" :
                "bg-neutral-100 text-neutral-600"
              }`}>
                {PICKUP_STATUS_LABEL[status]}
              </span>
              <span className="text-sm font-medium text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md">
                {job.items.map(i => i.category).join(" · ")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:items-end gap-1 text-sm bg-neutral-50 px-4 py-2 rounded-lg w-full md:w-auto">
          <div className="flex justify-between md:justify-start w-full gap-4">
            <span className="text-neutral-500">Est. Weight</span>
            <span className="font-bold text-[#1A1A1A]">{formatEstimatedWeightRange(job.estimatedMinKg, job.estimatedMaxKg) || "—"}</span>
          </div>
          <div className="flex justify-between md:justify-start w-full gap-4">
            <span className="text-neutral-500">Window</span>
            <span className="font-bold text-[#1A1A1A]">{formatDate(job.pickupDate)}</span>
          </div>
        </div>
      </div>

      {statusError && <div className="px-6 py-2"><ErrorBanner>{statusError}</ErrorBanner></div>}
      {geoError && <div className="px-6 py-2"><ErrorBanner>{geoError}</ErrorBanner></div>}

      {/* Hero Body */}
      <div className="flex flex-col">
        {status === "EN_ROUTE" && job.latitude != null && job.longitude != null && (
          <div className="flex flex-col gap-4">
            <div className="relative h-[300px] w-full bg-neutral-100 rounded-b-xl overflow-hidden">
              <MapView
                center={myLocation ?? { lat: job.latitude, lng: job.longitude }}
                marker={myLocation ? { ...myLocation, label: "You" } : undefined}
                routeOrigin={myLocation ?? undefined}
                routeDestination={{ lat: job.latitude, lng: job.longitude }}
                onRouteCalculated={setRouteInfo}
                className="absolute inset-0 w-full h-full border-0"
              />
              
              {/* Live Navigation Overlay */}
              {routeInfo && (
                <div className="absolute top-4 left-4 right-4 md:right-auto bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg border border-neutral-200 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#16A34A]/10 text-[#16A34A]">
                    <Navigation className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#1A1A1A] leading-none">{routeInfo.duration}</p>
                    <p className="text-sm font-medium text-neutral-500 mt-1">{routeInfo.distance} away</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-center p-6 bg-[#FAFAFA] border-t border-neutral-100">
              <Button 
                size="lg" 
                disabled={advancing} 
                onClick={handleAdvanceStatus}
                className="bg-[#16A34A] hover:bg-[#15803d] text-white font-bold px-12 border-0 shadow-md w-full sm:w-auto"
              >
                {advancing ? "Updating..." : "Arrived"}
              </Button>
            </div>
          </div>
        )}

        {status === "ARRIVED" && (
          <div className="p-6 md:p-8 bg-[#FAFAFA] flex flex-col items-center">
            <div className="w-full max-w-2xl bg-white border border-neutral-200 p-6 md:p-8 rounded-2xl shadow-sm">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-[#EA580C]/10 text-[#EA580C] rounded-full flex items-center justify-center mb-4">
                  <Scale className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-[#1A1A1A]">Record collected weight</h2>
                <p className="text-neutral-500 mt-2">Enter the exact weight for each category.</p>
              </div>

              <div className="flex flex-col gap-4 mb-8">
                {job.items.map((item) => (
                  <div key={item.category} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-neutral-50 border border-neutral-100 rounded-lg gap-4">
                    <span className="font-bold text-[#1A1A1A]">{item.category}</span>
                    <div className="w-full sm:w-48">
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        placeholder="0.0"
                        className="bg-white text-right font-bold text-lg"
                        value={exactWeights[item.category] ?? ""}
                        onChange={(e) => setExactWeights(prev => ({ ...prev, [item.category]: e.target.value }))}
                        icon={<span className="text-neutral-400 font-bold">kg</span>}
                        iconPosition="right"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <Button 
                  variant="ghost" 
                  onClick={() => getTrackingSocket().emit(PICKUP_STATUS_UPDATE_EVENT, { pickupRequestId: job.id, status: "EN_ROUTE" })}
                  className="text-neutral-500 w-full sm:w-auto"
                >
                  Back to En Route
                </Button>
                <Button 
                  size="lg" 
                  disabled={submittingWeights} 
                  onClick={handleSubmitWeights}
                  className="bg-[#16A34A] hover:bg-[#15803d] text-white font-bold w-full sm:w-auto px-8 border-0"
                >
                  {submittingWeights ? "Submitting..." : "Submit Weights"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {status === "VERIFYING_WEIGHTS" && (
          <div className="p-8 md:p-12 bg-[#FAFAFA] flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-16 h-16 bg-[#16A34A]/10 text-[#16A34A] rounded-full flex items-center justify-center mb-6 animate-pulse">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2 text-center">Waiting for household confirmation</h2>
            <p className="text-neutral-500 text-center max-w-md">
              Your collected weights have been submitted. The household needs to confirm them before this pickup can be completed.
            </p>
          </div>
        )}

        {status === "ASSIGNED" && (
          <div className="p-6 md:p-8 bg-[#FAFAFA] flex flex-col items-center justify-center min-h-[250px] border-t border-neutral-100">
            <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">Ready to collect?</h3>
            <p className="text-neutral-500 mb-6">Start navigating to the destination when you're ready.</p>
            <Button 
              size="lg" 
              disabled={advancing} 
              onClick={handleAdvanceStatus}
              className="bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold px-12 border-0 shadow-md"
            >
              {advancing ? "Starting..." : "Start driving"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}