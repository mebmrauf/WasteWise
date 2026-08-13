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
  /** Draws a coverage circle centered on `marker` (falls back to `center`). Meters. */
  circleRadiusMeters?: number;
  /** Fires with the clicked lat/lng — lets callers reposition their own marker. */
  onMapClick?: (position: { lat: number; lng: number }) => void;
}

type LoadState = "loading" | "ready" | "error";

const MAPS_SCRIPT_ID = "wastewise-google-maps-script";

let mapsApiPromise: Promise<typeof google.maps> | null = null;

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
    function handleLoad() {
      if (window.google?.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error("Google Maps script loaded but window.google.maps is unavailable."));
      }
    }

    function handleError() {
      reject(new Error("Failed to load the Google Maps script."));
    }

    const existingScript = document.getElementById(MAPS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", handleLoad, { once: true });
      existingScript.addEventListener("error", handleError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&v=weekly`;
    script.async = true;
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    document.head.appendChild(script);
  });

  mapsApiPromise.catch(() => {
    mapsApiPromise = null;
  });

  return mapsApiPromise;
}

export function Map({ center, marker, zoom = 14, className, routeOrigin, routeDestination, onRouteCalculated, circleRadiusMeters, onMapClick }: MapProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapsApiRef = React.useRef<typeof google.maps | null>(null);
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const markerRef = React.useRef<google.maps.Marker | null>(null);
  const circleRef = React.useRef<google.maps.Circle | null>(null);
  const clickListenerRef = React.useRef<google.maps.MapsEventListener | null>(null);
  const onMapClickRef = React.useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const directionsServiceRef = React.useRef<google.maps.DirectionsService | null>(null);
  const routePolylineRef = React.useRef<google.maps.Polyline | null>(null);
  const routeOriginMarkerRef = React.useRef<google.maps.Marker | null>(null);
  const routeDestinationMarkerRef = React.useRef<google.maps.Marker | null>(null);
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
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: false,
          styles: uberLikeMapStyle,
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
      markerRef.current?.setMap(null);
      markerRef.current = null;
      return;
    }

    const position = { lat: marker.lat, lng: marker.lng };

    if (markerRef.current) {
      markerRef.current.setPosition(position);
      markerRef.current.setLabel(marker.label ?? null);
    } else {
      markerRef.current = new mapsApiRef.current.Marker({
        map: mapRef.current,
        position,
        label: marker.label,
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

  React.useEffect(() => {
    if (loadState !== "ready" || !mapRef.current || !mapsApiRef.current) return;

    if (!routeOrigin || !routeDestination) {
      if (routePolylineRef.current) {
        routePolylineRef.current.setPath([]);
      }
      return;
    }

    if (!directionsServiceRef.current) {
      directionsServiceRef.current = new mapsApiRef.current.DirectionsService();
    }
    if (!routePolylineRef.current) {
      routePolylineRef.current = new mapsApiRef.current.Polyline({
        map: mapRef.current,
        strokeColor: "#059669", // primary-600
        strokeWeight: 4,
      });
    }

    if (!routeOriginMarkerRef.current) {
      routeOriginMarkerRef.current = new mapsApiRef.current.Marker({
        map: mapRef.current,
        icon: {
          path: mapsApiRef.current.SymbolPath.CIRCLE,
          fillColor: "#2563eb",
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: "#ffffff",
          scale: 8,
        },
        zIndex: 2,
      });
    }
    if (!routeDestinationMarkerRef.current) {
      routeDestinationMarkerRef.current = new mapsApiRef.current.Marker({
        map: mapRef.current,
        icon: {
          path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
          fillColor: "#000000",
          fillOpacity: 1,
          strokeWeight: 1,
          strokeColor: "#ffffff",
          scale: 1.5,
          anchor: new mapsApiRef.current.Point(12, 24),
        },
        zIndex: 1,
      });
    }

    routeOriginMarkerRef.current.setPosition(routeOrigin);
    routeDestinationMarkerRef.current.setPosition(routeDestination);

    directionsServiceRef.current.route(
      {
        origin: routeOrigin,
        destination: routeDestination,
        travelMode: mapsApiRef.current.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === mapsApiRef.current!.DirectionsStatus.OK && result && result.routes[0]) {
          routePolylineRef.current?.setPath(result.routes[0].overview_path);
          
          const leg = result.routes[0].legs[0];
          if (leg && onRouteCalculated) {
            onRouteCalculated({
              distance: leg.distance?.text || "",
              duration: leg.duration?.text || "",
            });
          }

          // Compute padded bounds
          const bounds = new mapsApiRef.current!.LatLngBounds();
          bounds.extend(routeOrigin);
          bounds.extend(routeDestination);
          mapRef.current?.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
        }
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional track primitive fields
  }, [loadState, routeOrigin?.lat, routeOrigin?.lng, routeDestination?.lat, routeDestination?.lng]);

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
