import { publicEnv } from "../env";
import type { AddressSuggestion } from "@/components/AddressAutocomplete";

const PLACES_AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";

export class PlacesConfigError extends Error {}

export class PlacesApiError extends Error {}

interface PlacesAutocompleteResponseBody {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
    };
  }>;
}

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
