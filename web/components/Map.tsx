"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { publicEnv } from "@/lib/env";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

export interface MapMarker {
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

export function Map({ center, marker, zoom = 14, className, routeOrigin, routeDestination }: MapProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapsApiRef = React.useRef<typeof google.maps | null>(null);
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const markerRef = React.useRef<google.maps.Marker | null>(null);
  const directionsServiceRef = React.useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = React.useRef<google.maps.DirectionsRenderer | null>(null);
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

    if (!routeOrigin || !routeDestination) {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setDirections({ routes: [] } as unknown as google.maps.DirectionsResult);
      }
      return;
    }

    if (!directionsServiceRef.current) {
      directionsServiceRef.current = new mapsApiRef.current.DirectionsService();
    }
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new mapsApiRef.current.DirectionsRenderer({
        map: mapRef.current,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: "#059669", // primary-600
          strokeWeight: 4,
        },
      });
    }

    directionsServiceRef.current.route(
      {
        origin: routeOrigin,
        destination: routeDestination,
        travelMode: mapsApiRef.current.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === mapsApiRef.current!.DirectionsStatus.OK && result) {
          directionsRendererRef.current?.setDirections(result);
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
