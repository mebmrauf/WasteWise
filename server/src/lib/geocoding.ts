// Server-side resolution of a Google Place ID (from the client's Places
// Autocomplete widget) into a formatted address + coordinates, via Google's
// Geocoding API. Mirrors the shape of lib/oauth/google.ts (an
// `isXConfigured()` check + a single async resolver that throws on failure).
//
// COST NOTE (explicit project constraint): this must be called exactly once
// per `PATCH /api/v1/users/me` request that includes a `placeId`, and from
// nowhere else in the backend. Never call this per-keystroke or
// speculatively — see docs/api-contract.md "User Profile" for the full
// cost-consciousness note. The client-side Autocomplete session-token/
// debouncing concern is a separate, later frontend task, not this module's
// job.
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

/**
 * Discriminated error type so the route can map each case to the right HTTP
 * response without inspecting error message strings.
 *
 * - "not_found": Google understood the request but the place_id didn't
 *   resolve to a usable result (ZERO_RESULTS, INVALID_REQUEST, or a
 *   malformed/missing result body) — this is a client-input problem, the
 *   route should respond 400.
 * - "upstream_failure": everything else — quota, auth, unknown Google
 *   errors, or a network-level failure reaching Google at all — this is not
 *   the client's fault, the route should respond 502 and log server-side.
 */
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

/**
 * Resolves a Google Place ID into a formatted address + coordinates.
 * Throws `GeocodingResolutionError` on any failure — never returns a partial
 * or best-guess result. Never logs the API key.
 */
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

  if (!response.ok) {
    throw new GeocodingResolutionError({
      type: "upstream_failure",
      reason: `Google Geocoding API returned HTTP ${response.status}`,
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

  if (body.status !== "OK") {
    if (NOT_FOUND_STATUSES.has(body.status)) {
      throw new GeocodingResolutionError({ type: "not_found", status: body.status });
    }
    // OVER_QUERY_LIMIT | REQUEST_DENIED | UNKNOWN_ERROR | anything else
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
