import { env } from "./env";

const GEOCODE_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";

export function isGeocodingConfigured(): boolean {
  return Boolean(env.GOOGLE_MAPS_SERVER_API_KEY);
}

export interface ResolvedAddress {
  formattedAddress: string;
  latitude: number;
  longitude: number;
}

export type GeocodingError =
  | { type: "not_found"; status: string }
  | { type: "upstream_failure"; reason: string };

export class GeocodingResolutionError extends Error {
  readonly details: GeocodingError;

  constructor(details: GeocodingError) {
    super(`Geocoding failed: ${details.type}`);
    this.name = "GeocodingResolutionError";
    this.details = details;
  }
}

interface GoogleGeocodeResponse {
  status: string;
  results?: Array<{
    formatted_address?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
    place_id?: string;
  }>;
}

const NOT_FOUND_STATUSES = new Set(["ZERO_RESULTS", "INVALID_REQUEST"]);

export async function resolveAddressFromPlaceId(placeId: string): Promise<ResolvedAddress> {
  const params = new URLSearchParams({
    place_id: placeId,
    key: env.GOOGLE_MAPS_SERVER_API_KEY,
  });

  let response: Response;
  try {
    response = await fetch(`${GEOCODE_ENDPOINT}?${params.toString()}`);
  } catch (err) {
    throw new GeocodingResolutionError({
      type: "upstream_failure",
      reason: err instanceof Error ? err.message : "network error",
    });
  }

  let body: GoogleGeocodeResponse;
  try {
    body = (await response.json()) as GoogleGeocodeResponse;
  } catch {
    throw new GeocodingResolutionError({
      type: "upstream_failure",
      reason: "Failed to parse Google Geocoding API response",
    });
  }

  if (body.status && NOT_FOUND_STATUSES.has(body.status)) {
    throw new GeocodingResolutionError({ type: "not_found", status: body.status });
  }

  if (!response.ok) {
    throw new GeocodingResolutionError({
      type: "upstream_failure",
      reason: `Google Geocoding API returned HTTP ${response.status}${body.status ? ` (status: ${body.status})` : ""}`,
    });
  }

  if (body.status !== "OK") {
    throw new GeocodingResolutionError({
      type: "upstream_failure",
      reason: `Google Geocoding API status: ${body.status}`,
    });
  }

  const result = body.results?.[0];
  const lat = result?.geometry?.location?.lat;
  const lng = result?.geometry?.location?.lng;
  if (!result?.formatted_address || typeof lat !== "number" || typeof lng !== "number") {
    throw new GeocodingResolutionError({ type: "not_found", status: "ZERO_RESULTS" });
  }

  return { formattedAddress: result.formatted_address, latitude: lat, longitude: lng };
}
