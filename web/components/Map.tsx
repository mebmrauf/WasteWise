"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { publicEnv } from "@/lib/env";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";
import { uberLikeMapStyle } from "./mapStyle";

interface MapMarker {
  lat: number;
  lng: number;
  label?: string;
}

export interface MapProps {
  center: { lat: number; lng: number };
  marker?: MapMarker;
  zoom?: number;
  className?: string;
  routeOrigin?: { lat: number; lng: number };
  routeDestination?: { lat: number; lng: number };
  onRouteCalculated?: (info: { distance: string; duration: string } | null) => void;
  /**
   * Ordered stop list for a multi-stop route — last entry is the DirectionsService
   * destination, all others are intermediate waypoints. When provided (length >= 1),
   * takes precedence over `routeDestination`. Each stop is drawn as a numbered pin
   * (falling back to its 1-based index when `label` is omitted).
   */
  waypoints?: MapMarker[];
  /** Per-leg breakdown, only populated when `waypoints` has more than one entry. */
  onLegsCalculated?: (legs: { distance: string; duration: string }[]) => void;
  /** Draws a coverage circle centered on `marker` (falls back to `center`). Meters. */
  circleRadiusMeters?: number;
  onMapClick?: (position: { lat: number; lng: number }) => void;
  onWaypointsOptimized?: (optimizedOrderIndices: number[]) => void;
}

function formatDistanceKm(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDurationMinutes(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
}

type LoadState = "loading" | "ready" | "error";

const MAPS_SCRIPT_ID = "wastewise-google-maps-script";

const CALLBACK_NAME = "__wastewiseGoogleMapsInitCallback";

let mapsApiPromise: Promise<typeof google.maps> | null = null;
let isLoading = false;

function loadGoogleMapsApi(apiKey: string): Promise<typeof google.maps> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only be loaded in the browser."));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (mapsApiPromise) {
    return mapsApiPromise;
  }

  mapsApiPromise = new Promise<typeof google.maps>((resolve, reject) => {
    // If it's already loading, just hijack the callback
    const previousCallback = (window as any)[CALLBACK_NAME];
    
    (window as any)[CALLBACK_NAME] = () => {
      if (previousCallback) previousCallback();
      resolve(window.google.maps);
    };

    if (isLoading) return; // Script already injected by another call

    isLoading = true;

    function handleError() {
      isLoading = false;
      reject(new Error("Failed to load the Google Maps script."));
    }

    const existingScript = document.getElementById(MAPS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("error", handleError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=${CALLBACK_NAME}&libraries=marker,routes,geometry&loading=async&v=weekly`;
    script.async = true;
    script.defer = true;
    script.addEventListener("error", handleError, { once: true });
    document.head.appendChild(script);
  });

  mapsApiPromise.catch(() => {
    mapsApiPromise = null;
    isLoading = false;
  });

  return mapsApiPromise;
}

export function Map({ center, marker, zoom = 14, className, routeOrigin, routeDestination, onRouteCalculated, waypoints, onLegsCalculated, circleRadiusMeters, onMapClick, onWaypointsOptimized }: MapProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapsApiRef = React.useRef<typeof google.maps | null>(null);
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const markerRef = React.useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const circleRef = React.useRef<google.maps.Circle | null>(null);
  const clickListenerRef = React.useRef<google.maps.MapsEventListener | null>(null);
  const onMapClickRef = React.useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const routePolylineRef = React.useRef<google.maps.Polyline | null>(null);
  const routeOriginMarkerRef = React.useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const routeDestinationMarkerRef = React.useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const waypointMarkersRef = React.useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [loadState, setLoadState] = React.useState<LoadState>("loading");

  const apiKey = publicEnv.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  React.useEffect(() => {
    if (!apiKey) {
      setLoadState("error");
      return;
    }

    let cancelled = false;

    loadGoogleMapsApi(apiKey)
      .then((maps) => {
        if (cancelled || !containerRef.current) return;
        mapsApiRef.current = maps;
        mapRef.current = new maps.Map(containerRef.current, {
          center,
          zoom,
          mapId: "DEMO_MAP_ID",
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: false,
        });
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-time setup; see comment above.
  }, [apiKey]);

  // Registered once the map exists; reads the latest onMapClick via a ref so
  // the listener doesn't need to be torn down/recreated on every render.
  React.useEffect(() => {
    if (loadState !== "ready" || !mapRef.current || !mapsApiRef.current) return;

    clickListenerRef.current = mapRef.current.addListener("click", (event: google.maps.MapMouseEvent) => {
      if (!event.latLng || !onMapClickRef.current) return;
      onMapClickRef.current({ lat: event.latLng.lat(), lng: event.latLng.lng() });
    });

    return () => {
      clickListenerRef.current?.remove();
      clickListenerRef.current = null;
    };
  }, [loadState]);

  React.useEffect(() => {
    if (loadState !== "ready" || !mapRef.current) return;
    mapRef.current.setCenter(center);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: track lat/lng primitives, not `center` object identity; see comment above.
  }, [loadState, center.lat, center.lng]);

  React.useEffect(() => {
    if (loadState !== "ready" || !mapRef.current) return;
    mapRef.current.setZoom(zoom);
  }, [loadState, zoom]);

  React.useEffect(() => {
    if (loadState !== "ready" || !mapRef.current || !mapsApiRef.current) return;

    if (!marker) {
      if (markerRef.current) markerRef.current.map = null;
      markerRef.current = null;
      return;
    }

    const position = { lat: marker.lat, lng: marker.lng };

    if (markerRef.current) {
      markerRef.current.map = mapRef.current;
      markerRef.current.position = position;
      if (marker.label && markerRef.current.content instanceof HTMLElement) {
        markerRef.current.content.innerText = marker.label;
      }
    } else {
      let content: HTMLElement | undefined = undefined;
      if (marker.label) {
        const pin = new mapsApiRef.current.marker.PinElement({
          glyph: marker.label,
        });
        content = pin.element;
      }

      markerRef.current = new mapsApiRef.current.marker.AdvancedMarkerElement({
        map: mapRef.current,
        position,
        content,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: track marker's primitive fields, not object identity, for the same reason as the center/zoom effect above.
  }, [loadState, marker?.lat, marker?.lng, marker?.label]);

  React.useEffect(() => {
    if (loadState !== "ready" || !mapRef.current || !mapsApiRef.current) return;

    if (!circleRadiusMeters) {
      circleRef.current?.setMap(null);
      circleRef.current = null;
      return;
    }

    const circleCenter = marker ? { lat: marker.lat, lng: marker.lng } : center;

    if (circleRef.current) {
      circleRef.current.setCenter(circleCenter);
      circleRef.current.setRadius(circleRadiusMeters);
    } else {
      circleRef.current = new mapsApiRef.current.Circle({
        map: mapRef.current,
        center: circleCenter,
        radius: circleRadiusMeters,
        strokeColor: "#059669", // primary-600
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#059669",
        fillOpacity: 0.12,
        clickable: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: track primitive fields, not object identity.
  }, [loadState, circleRadiusMeters, marker?.lat, marker?.lng, center.lat, center.lng]);

  const hasWaypoints = !!waypoints && waypoints.length > 0;
  const waypointsKey = waypoints ? waypoints.map((w) => `${w.lat},${w.lng},${w.label ?? ""}`).join("|") : "";

  React.useEffect(() => {
    if (loadState !== "ready" || !mapRef.current || !mapsApiRef.current) return;

    if (!routeOrigin || (!routeDestination && !hasWaypoints)) {
      if (routePolylineRef.current) {
        routePolylineRef.current.setPath([]);
      }
      waypointMarkersRef.current.forEach((m) => { m.map = null; });
      waypointMarkersRef.current = [];
      return;
    }

    if (!routePolylineRef.current) {
      routePolylineRef.current = new mapsApiRef.current.Polyline({
        map: mapRef.current,
        strokeColor: "#059669", // primary-600
        strokeWeight: 4,
      });
    }

    if (!routeOriginMarkerRef.current) {
      const originIcon = document.createElement("div");
      originIcon.style.width = "16px";
      originIcon.style.height = "16px";
      originIcon.style.backgroundColor = "#2563eb";
      originIcon.style.border = "2px solid #ffffff";
      originIcon.style.borderRadius = "50%";
      originIcon.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";

      routeOriginMarkerRef.current = new mapsApiRef.current.marker.AdvancedMarkerElement({
        map: mapRef.current,
        content: originIcon,
        zIndex: 2,
      });
    }
    routeOriginMarkerRef.current.map = mapRef.current;
    routeOriginMarkerRef.current.position = routeOrigin;

    if (hasWaypoints) {
      if (routeDestinationMarkerRef.current) {
        routeDestinationMarkerRef.current.map = null;
      }

      const stops = waypoints!;
      while (waypointMarkersRef.current.length > stops.length) {
        const m = waypointMarkersRef.current.pop();
        if (m) m.map = null;
      }
      stops.forEach((stop, index) => {
        let stopMarker = waypointMarkersRef.current[index];
        if (!stopMarker) {
          const pin = new mapsApiRef.current!.marker.PinElement({
            background: "#059669",
            borderColor: "#ffffff",
            glyphColor: "#ffffff",
            glyph: stop.label ?? String(index + 1),
            scale: 1.2
          });
          stopMarker = new mapsApiRef.current!.marker.AdvancedMarkerElement({
            map: mapRef.current!,
            content: pin.element,
            zIndex: 3,
          });
          waypointMarkersRef.current[index] = stopMarker;
        }
        stopMarker.position = { lat: stop.lat, lng: stop.lng };
      });

      const lastStop = stops[stops.length - 1];
      const intermediateStops = stops.slice(0, -1);

      const directionsService = new mapsApiRef.current.DirectionsService();
      directionsService.route({
        origin: routeOrigin,
        destination: { lat: lastStop.lat, lng: lastStop.lng },
        waypoints: intermediateStops.map((stop) => ({ location: { lat: stop.lat, lng: stop.lng }, stopover: true })),
        travelMode: mapsApiRef.current.TravelMode.DRIVING,
      }).then((result) => {
        if (result.routes && result.routes[0]) {
          const route = result.routes[0];
          
          const legs = route.legs || [];
          let pathLatLngs: { lat: number, lng: number }[] = [];
          legs.forEach(leg => {
            leg.steps?.forEach(step => {
              step.path?.forEach(p => {
                pathLatLngs.push({ lat: p.lat(), lng: p.lng() });
              });
            });
          });

          if (pathLatLngs.length > 0) {
            pathLatLngs.unshift({ lat: routeOrigin.lat, lng: routeOrigin.lng });
            pathLatLngs.push({ lat: lastStop.lat, lng: lastStop.lng });
          }
          routePolylineRef.current?.setPath(pathLatLngs);
          if (onLegsCalculated) {
            onLegsCalculated(
              legs.map((leg) => ({
                distance: leg.distance?.text || "",
                duration: leg.duration?.text || "",
              }))
            );
          }
          if (onRouteCalculated) {
            let totalDist = 0;
            let totalDur = 0;
            legs.forEach((leg) => {
              totalDist += leg.distance?.value || 0;
              totalDur += leg.duration?.value || 0;
            });
            onRouteCalculated({
              distance: formatDistanceKm(totalDist),
              duration: formatDurationMinutes(totalDur / 1000),
            });
          }

          if (route.bounds) {
            mapRef.current?.fitBounds(route.bounds, { top: 60, bottom: 60, left: 60, right: 60 });
          }
        }
      }).catch((err) => console.error("DirectionsService route computation failed", err));
      return;
    }

    waypointMarkersRef.current.forEach((m) => { m.map = null; });
    waypointMarkersRef.current = [];

    if (!routeDestinationMarkerRef.current) {
      const destContainer = document.createElement("div");
      destContainer.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3)); transform: translate(-12px, -24px);">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#000000" stroke="#ffffff" stroke-width="1"/>
      </svg>`;

      routeDestinationMarkerRef.current = new mapsApiRef.current.marker.AdvancedMarkerElement({
        map: mapRef.current,
        content: destContainer,
        zIndex: 1,
      });
    }
    routeDestinationMarkerRef.current.map = mapRef.current;
    routeDestinationMarkerRef.current.position = routeDestination!;

    const directionsService = new mapsApiRef.current.DirectionsService();
    directionsService.route({
      origin: routeOrigin,
      destination: routeDestination!,
      travelMode: mapsApiRef.current.TravelMode.DRIVING,
    }).then((result) => {
      if (result.routes && result.routes[0]) {
        const route = result.routes[0];
        
        const legs = route.legs || [];
        let pathLatLngs: { lat: number, lng: number }[] = [];
        legs.forEach(leg => {
          leg.steps?.forEach(step => {
            step.path?.forEach(p => {
              pathLatLngs.push({ lat: p.lat(), lng: p.lng() });
            });
          });
        });

        if (pathLatLngs.length > 0) {
          pathLatLngs.unshift({ lat: routeOrigin.lat, lng: routeOrigin.lng });
          if (routeDestination) pathLatLngs.push({ lat: routeDestination.lat, lng: routeDestination.lng });
        }
        routePolylineRef.current?.setPath(pathLatLngs);

        if (onRouteCalculated) {
          const legs = route.legs || [];
          let totalDist = 0;
          let totalDur = 0;
          legs.forEach((leg) => {
            totalDist += leg.distance?.value || 0;
            totalDur += leg.duration?.value || 0;
          });
          onRouteCalculated({
            distance: formatDistanceKm(totalDist),
            duration: formatDurationMinutes(totalDur / 1000),
          });
        }

        if (route.bounds) {
          mapRef.current?.fitBounds(route.bounds, { top: 60, bottom: 60, left: 60, right: 60 });
        }
      }
    }).catch((err) => console.error("DirectionsService route computation failed", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional track primitive fields
  }, [loadState, routeOrigin?.lat, routeOrigin?.lng, routeDestination?.lat, routeDestination?.lng, hasWaypoints, waypointsKey]);

  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50", className)}>
      <div ref={containerRef} className={cn("h-full w-full", loadState !== "ready" && "hidden")} />

      {loadState === "loading" && (
        <div className="flex h-full w-full items-center justify-center p-6">
          <p className="text-body-sm text-neutral-500">Loading map…</p>
        </div>
      )}

      {loadState === "error" && (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center">
          <Icon icon={AlertTriangle} size="lg" className="text-error-500" aria-hidden />
          <p className="text-body-sm text-neutral-600">Couldn&apos;t load the map.</p>
          <p className="text-body-sm text-neutral-500">Check your connection and try again.</p>
        </div>
      )}
    </div>
  );
}
