"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Compass, MapPin, Navigation, Route as RouteIcon, Clock, Package } from "lucide-react";
import { Button } from "@/components/Button";
import { CollectorEmptyState } from "@/components/CollectorEmptyState";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Icon } from "@/components/Icon";
import { Map } from "@/components/Map";
import { formatDate } from "@/components/AvailableJobListItem";
import { ActiveJobTracker } from "@/components/ActiveJobTracker";
import { AuthApiError } from "@/lib/api/auth";
import { formatEstimatedWeightRange } from "@/lib/api/pickups";
import { getActiveRoute, getSuggestedRoute, startRoute, type SuggestedRoute } from "@/lib/api/routes";

type LoadState = "loading" | "ready" | "error" | "already_active" | "no_origin";

const loadErrorMessages: Record<string, string> = {
  COLLECTOR_NOT_VERIFIED: "Your collector account must be verified before you can plan a route.",
};

export function RoutePlannerView() {
  const router = useRouter();
  const [loadState, setLoadState] = React.useState<LoadState>("loading");
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [route, setRoute] = React.useState<SuggestedRoute | null>(null);
  const [excludedPickupIds, setExcludedPickupIds] = React.useState<Set<string>>(new Set());
  const [starting, setStarting] = React.useState(false);
  const [startError, setStartError] = React.useState<string | null>(null);
  const [isNearbyOpen, setIsNearbyOpen] = React.useState(false);

  const fetchRoute = React.useCallback(() => {
    setLoadState("loading");
    setLoadError(null);
    getActiveRoute()
      .then(({ routePlan }) => {
        if (routePlan) {
          setLoadState("already_active");
          return;
        }
        return getSuggestedRoute()
          .then((suggested) => {
            setRoute(suggested);
            setExcludedPickupIds(new Set());
            setLoadState("ready");
          })
          .catch((err: unknown) => {
            if (err instanceof AuthApiError && err.code === "NO_ORIGIN") {
              setLoadState("no_origin");
              return;
            }
            setLoadError(
              err instanceof AuthApiError
                ? (loadErrorMessages[err.code] ?? "Couldn't load a suggested route. Try refreshing the page.")
                : "Couldn't load a suggested route. Try refreshing the page.",
            );
            setLoadState("error");
          });
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setLoadError(`Couldn't load your route. Error: ${msg}`);
        setLoadState("error");
      });
  }, []);

  React.useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  function toggleStop(pickupRequestId: string) {
    setExcludedPickupIds((prev) => {
      const next = new Set(prev);
      if (next.has(pickupRequestId)) next.delete(pickupRequestId);
      else next.add(pickupRequestId);
      return next;
    });
  }

  const handleWaypointsOptimized = React.useCallback((optimizedFilteredIndices: number[]) => {
    setRoute((prev) => {
      if (!prev) return prev;
      
      const included = prev.stops.filter(s => !excludedPickupIds.has(s.pickup.id));
      const excluded = prev.stops.filter(s => excludedPickupIds.has(s.pickup.id));
      
      if (included.length < 2) return prev; // nothing to optimize
      
      // Reorder ALL included stops based on the loop path
      const newIncluded = optimizedFilteredIndices.map(i => included[i]);
      
      // Update sequence numbers to match the new optimized order
      let seq = 1;
      for (const stop of newIncluded) {
        stop.sequence = seq++;
      }
      for (const stop of excluded) {
        stop.sequence = seq++;
      }
      
      return {
        ...prev,
        stops: [...newIncluded, ...excluded]
      };
    });
  }, [excludedPickupIds]);

  function handleStart() {
    if (!route) return;
    const includedIds = route.stops.map((s) => s.pickup.id).filter((id) => !excludedPickupIds.has(id));
    if (includedIds.length === 0) {
      setStartError("Include at least one stop to start a route.");
      return;
    }
    setStartError(null);
    setStarting(true);
    startRoute(includedIds)
      .then(() => {
        setLoadState("already_active");
      })
      .catch((err: unknown) => {
        setStarting(false);
        setStartError(
          err instanceof AuthApiError
            ? (err.message || "Couldn't start the route. Try again.")
            : "Couldn't start the route. Try again.",
        );
      });
  }

  if (loadState === "loading") {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-neutral-200">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16A34A] mb-4"></div>
        <p className="text-sm font-medium text-neutral-500">Calculating optimal route…</p>
      </div>
    );
  }

  if (loadState === "error") {
    return <ErrorBanner className="mt-8">{loadError}</ErrorBanner>;
  }

  if (loadState === "already_active") {
    return <ActiveJobTracker />;
  }

  if (loadState === "no_origin") {
    return (
      <CollectorEmptyState
        icon={MapPin}
        tone="amber"
        title="Set your location to build your route"
        description="The system needs your location to calculate the optimal starting point."
      >
        <Button href="/collector/profile" className="px-8 bg-[#EA580C] hover:bg-[#C2410C] text-white border-0">Go to profile</Button>
      </CollectorEmptyState>
    );
  }

  if (!route) return null;

  if (route.stops.length === 0) {
    return (
      <CollectorEmptyState
        icon={Compass}
        title="You're all clear"
        description="No pickups are currently assigned to you."
      >
        {route.nearbyOpenPickups.length === 0 && (
          <Button href="/collector/jobs" className="px-8 bg-[#16A34A] hover:bg-[#15803d] text-white border-0">Find Jobs</Button>
        )}
      </CollectorEmptyState>
    );
  }

  const includedCount = route.stops.length - excludedPickupIds.size;
  const totalIncludedDistance = route.stops
    .filter(s => !excludedPickupIds.has(s.pickup.id))
    .reduce((acc, curr) => acc + curr.distanceFromPrevKm, 0);
  const totalIncludedEta = route.stops
    .filter(s => !excludedPickupIds.has(s.pickup.id))
    .reduce((acc, curr) => acc + curr.etaMinutes, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Action Bar (Top) */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-white border border-neutral-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-6 mb-4 sm:mb-0">
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Ready to start?</p>
            <div className="flex items-center gap-4 text-sm font-medium text-[#1A1A1A]">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-[#16A34A]" /> {includedCount} stops</span>
              <span className="flex items-center gap-1"><Navigation className="w-4 h-4 text-neutral-400" /> {totalIncludedDistance.toFixed(1)} km</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-neutral-400" /> ~{totalIncludedEta} min</span>
            </div>
          </div>
        </div>
        <Button 
          size="lg" 
          disabled={starting || includedCount === 0} 
          onClick={handleStart}
          className="w-full sm:w-auto bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold px-8 shadow-sm border-0"
        >
          {starting ? "Starting…" : "Start Route"}
        </Button>
      </div>
      
      {startError && <ErrorBanner>{startError}</ErrorBanner>}

      {/* Main Workspace */}
      <div className="flex flex-col lg:flex-row gap-6 lg:h-[70vh] min-h-[600px]">
        {/* Map Area (60%) */}
        <div className="lg:w-[60%] flex flex-col h-[400px] lg:h-full relative rounded-xl overflow-hidden border border-neutral-200 shadow-sm bg-neutral-100">
          <Map
            center={route.origin}
            waypoints={route.stops
              .filter((s) => !excludedPickupIds.has(s.pickup.id))
              .map((s) => ({ lat: s.pickup.latitude ?? 0, lng: s.pickup.longitude ?? 0, label: String(s.sequence) }))}
            routeOrigin={route.origin}
            onWaypointsOptimized={handleWaypointsOptimized}
            className="absolute inset-0 w-full h-full border-0 shadow-none"
          />
        </div>

        {/* Route List (40%) */}
        <div className="lg:w-[40%] flex flex-col h-full bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-200">
            <h3 className="text-sm font-bold text-[#1A1A1A]">Route Sequence</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            <div className="flex flex-col gap-2">
              {route.stops.map((stop) => {
                const isExcluded = excludedPickupIds.has(stop.pickup.id);
                return (
                  <div
                    key={stop.pickup.id}
                    className={`group relative flex items-start p-3 rounded-lg border transition-colors ${
                      isExcluded ? "bg-neutral-50 border-transparent opacity-60" : "bg-white border-neutral-100 hover:border-neutral-300 shadow-sm"
                    }`}
                  >
                    {/* Sequence Number */}
                    <div className={`flex shrink-0 items-center justify-center w-8 h-8 rounded-full font-bold text-sm mr-3 ${
                      isExcluded ? "bg-neutral-200 text-neutral-500" : "bg-[#1A1A1A] text-white"
                    }`}>
                      {stop.sequence < 10 ? `0${stop.sequence}` : stop.sequence}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="truncate pr-4">
                          <p className="text-sm font-bold text-[#1A1A1A] truncate">{stop.pickup.pickupFormattedAddress.split(',')[0]}</p>
                          <p className="text-xs text-neutral-500 truncate">{stop.pickup.pickupFormattedAddress}</p>
                        </div>
                        <label className="flex items-center cursor-pointer shrink-0 mt-1">
                          <input
                            type="checkbox"
                            checked={!isExcluded}
                            onChange={() => toggleStop(stop.pickup.id)}
                            className="h-4 w-4 rounded border-neutral-300 text-[#16A34A] focus:ring-[#16A34A] transition-colors"
                          />
                        </label>
                      </div>

                      <div className="mt-2 flex items-center flex-wrap gap-2 text-xs">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-medium">
                          {stop.pickup.items.map(i => i.category).join(" · ")}
                        </span>
                        
                        {formatEstimatedWeightRange(stop.pickup.estimatedMinKg, stop.pickup.estimatedMaxKg) && (
                          <span className="flex items-center text-neutral-500">
                            <Package className="w-3 h-3 mr-1" />
                            {formatEstimatedWeightRange(stop.pickup.estimatedMinKg, stop.pickup.estimatedMaxKg)}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Navigation className="w-3 h-3" />
                            {stop.distanceFromPrevKm.toFixed(1)} km · ~{stop.etaMinutes} min
                          </span>
                        </div>
                        <span className="font-semibold text-neutral-900">{formatDate(stop.pickup.pickupDate)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Nearby Jobs Expandable Panel */}
            {route.nearbyOpenPickups.length > 0 && (
              <div className="mt-4 border border-neutral-200 rounded-lg overflow-hidden">
                <button 
                  onClick={() => setIsNearbyOpen(!isNearbyOpen)}
                  className="w-full flex items-center justify-between p-3 bg-neutral-50 hover:bg-neutral-100 transition-colors text-sm font-bold text-[#1A1A1A]"
                >
                  Nearby opportunities
                  <span className="text-xs font-normal text-[#16A34A] bg-[#16A34A]/10 px-2 py-0.5 rounded-full">{route.nearbyOpenPickups.length} available</span>
                </button>
                
                {isNearbyOpen && (
                  <div className="p-3 bg-white border-t border-neutral-200 flex flex-col gap-3">
                    <p className="text-xs text-neutral-500">Open pickups along your route</p>
                    <div className="flex flex-col gap-2">
                      {route.nearbyOpenPickups.map((pickup) => (
                        <div key={pickup.id} className="flex flex-col gap-1 p-2 border border-neutral-100 rounded bg-neutral-50">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#1A1A1A] truncate">{pickup.pickupFormattedAddress.split(',')[0]}</span>
                            {formatEstimatedWeightRange(pickup.estimatedMinKg, pickup.estimatedMaxKg) && (
                              <span className="text-xs text-neutral-500 font-medium">{formatEstimatedWeightRange(pickup.estimatedMinKg, pickup.estimatedMaxKg)}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-neutral-500 truncate">{pickup.items.map(i => i.category).join(" · ")}</span>
                            <Button href="/collector/jobs" variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-[#16A34A] hover:bg-[#16A34A]/10">View Jobs</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
