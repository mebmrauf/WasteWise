// Client-side wrapper around Google's Places Autocomplete (New) REST API, feeding suggestions
// into the presentational AddressAutocomplete combobox. Calls Google directly from the browser
// with the public Maps key (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, restricted to the Places API +
// this app's origin) — a separate server-only key handles Geocoding in server/src/lib/geocoding.ts.
//
// Deliberately does NOT own debouncing, minimum-length gating, or session-token lifecycle —
// those require knowing when the user starts/stops editing, which only ProfileView.tsx knows.
// This file only implements the single HTTP call and response mapping.
import { publicEnv } from "../env";
import type { AddressSuggestion } from "@/components/AddressAutocomplete";

const PLACES_AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";

/** Thrown when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is blank — distinct from a live request failure so callers can show a more specific message. */
export class PlacesConfigError extends Error {}

/** Thrown for any non-2xx response, or a 2xx response body that fails to parse — never lets a raw Google error object reach UI code. */
export class PlacesApiError extends Error {}

interface PlacesAutocompleteResponseBody {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
    };
  }>;
}

/**
 * Calls Google's `places:autocomplete` endpoint and maps the response into
 * the `{ placeId, description }[]` shape `AddressAutocomplete` expects.
 * Resolves to an empty array (not a throw) when Google returns no
 * `suggestions` field at all, or a placePrediction is missing an id/text
 * pair — treated as "no matches," not an error.
 */
export async function fetchAddressSuggestions(
  input: string,
  sessionToken: string,
): Promise<AddressSuggestion[]> {
  const apiKey = publicEnv.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new PlacesConfigError("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured.");
  }

  const res = await fetch(PLACES_AUTOCOMPLETE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
    },
    body: JSON.stringify({
      input,
      sessionToken,
      includedRegionCodes: ["bd"],
    }),
  });

  if (!res.ok) {
    throw new PlacesApiError(`Places Autocomplete request failed with status ${res.status}`);
  }

  let body: PlacesAutocompleteResponseBody;
  try {
    body = await res.json();
  } catch {
    throw new PlacesApiError("Places Autocomplete returned a non-JSON response.");
  }

  const rawSuggestions = body.suggestions ?? [];
  const suggestions: AddressSuggestion[] = [];
  for (const entry of rawSuggestions) {
    const placeId = entry.placePrediction?.placeId;
    const description = entry.placePrediction?.text?.text;
    if (placeId && description) {
      suggestions.push({ placeId, description });
    }
  }
  return suggestions;
}
