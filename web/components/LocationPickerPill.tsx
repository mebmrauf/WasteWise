"use client";

import * as React from "react";
import { Home, Navigation, Search, ChevronDown, MapPin } from "lucide-react";
import { Icon } from "@/components/Icon";
import { AddressAutocomplete, type AddressSuggestion } from "@/components/AddressAutocomplete";
import {
  fetchAddressSuggestions,
  fetchPlaceDetails,
  fetchReverseGeocode,
  PlacesConfigError,
} from "@/lib/api/places";
import { cn } from "@/lib/utils";

export interface ResolvedLocation {
  label: string;
  latitude: number;
  longitude: number;
}

export interface SavedAddress {
  formattedAddress: string;
  latitude: number;
  longitude: number;
}

export interface LocationPickerPillProps {
  savedAddress: SavedAddress | null;
  value: ResolvedLocation | null;
  onChange: (location: ResolvedLocation) => void;
  className?: string;
}

const ADDRESS_DEBOUNCE_MS = 300;
const ADDRESS_MIN_QUERY_LENGTH = 3;

export function LocationPickerPill({ savedAddress, value, onChange, className }: LocationPickerPillProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);

  const [isLoadingCurrent, setIsLoadingCurrent] = React.useState(false);
  const [currentError, setCurrentError] = React.useState<string | null>(null);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchSuggestions, setSearchSuggestions] = React.useState<AddressSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = React.useState(false);
  const [suggestionsError, setSuggestionsError] = React.useState<string | null>(null);

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const sessionTokenRef = React.useRef<string | null>(null);
  const debounceTimerRef = React.useRef<number | null>(null);
  const requestSeqRef = React.useRef(0);

  React.useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsSearching(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) window.clearTimeout(debounceTimerRef.current);
    };
  }, []);

  function closePanel() {
    setIsOpen(false);
    setIsSearching(false);
  }

  function handleSelectSaved() {
    if (!savedAddress) return;
    onChange({
      label: savedAddress.formattedAddress,
      latitude: savedAddress.latitude,
      longitude: savedAddress.longitude,
    });
    closePanel();
  }

  function handleSelectCurrent() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setCurrentError("Geolocation isn't supported by this browser.");
      return;
    }
    setIsLoadingCurrent(true);
    setCurrentError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchReverseGeocode(position.coords.latitude, position.coords.longitude)
          .then((place) => {
            setIsLoadingCurrent(false);
            onChange({ label: place.formattedAddress, latitude: place.latitude, longitude: place.longitude });
            closePanel();
          })
          .catch((err: unknown) => {
            setIsLoadingCurrent(false);
            setCurrentError(err instanceof Error ? err.message : "Couldn't detect your address.");
          });
      },
      (err) => {
        setIsLoadingCurrent(false);
        setCurrentError(`Couldn't get your location (${err.message}). Make sure permissions are granted.`);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  function ensureSessionToken(): string {
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = crypto.randomUUID();
    }
    return sessionTokenRef.current;
  }

  async function runSuggestionsFetch(query: string) {
    const seq = ++requestSeqRef.current;
    setIsLoadingSuggestions(true);
    setSuggestionsError(null);
    try {
      const results = await fetchAddressSuggestions(query, ensureSessionToken());
      if (seq !== requestSeqRef.current) return;
      setSearchSuggestions(results);
      setIsLoadingSuggestions(false);
    } catch (err) {
      if (seq !== requestSeqRef.current) return;
      setSearchSuggestions([]);
      setIsLoadingSuggestions(false);
      setSuggestionsError(
        err instanceof PlacesConfigError ? "Address search isn't available right now." : "Couldn't load address suggestions. Try again."
      );
    }
  }

  function handleSearchQueryChange(nextQuery: string) {
    setSearchQuery(nextQuery);

    if (debounceTimerRef.current !== null) window.clearTimeout(debounceTimerRef.current);

    const trimmed = nextQuery.trim();
    if (trimmed.length < ADDRESS_MIN_QUERY_LENGTH) {
      requestSeqRef.current += 1;
      setSearchSuggestions([]);
      setIsLoadingSuggestions(false);
      setSuggestionsError(null);
      return;
    }

    debounceTimerRef.current = window.setTimeout(() => {
      void runSuggestionsFetch(trimmed);
    }, ADDRESS_DEBOUNCE_MS);
  }

  async function handleSelectSuggestion(suggestion: AddressSuggestion) {
    if (debounceTimerRef.current !== null) window.clearTimeout(debounceTimerRef.current);
    requestSeqRef.current += 1;
    sessionTokenRef.current = null;
    setSearchSuggestions([]);
    setSuggestionsError(null);
    try {
      const details = await fetchPlaceDetails(suggestion.placeId);
      onChange({ label: suggestion.description, latitude: details.latitude, longitude: details.longitude });
      setSearchQuery("");
      closePanel();
    } catch {
      setSuggestionsError("Couldn't resolve that address. Try another one.");
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg border-2 border-primary-300 bg-white px-3 py-2 text-left text-body-sm text-neutral-900 transition-colors",
          "hover:border-primary-400 focus:outline-none focus-visible:shadow-focus"
        )}
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary-100 text-primary-700">
          <Icon icon={value ? MapPin : Home} size="sm" />
        </div>
        <span className="min-w-0 flex-1 truncate font-medium">
          {value ? value.label : "Set your location to find nearby collectors"}
        </span>
        <Icon icon={ChevronDown} size="sm" className={cn("shrink-0 text-neutral-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-20 mt-2 w-full min-w-[320px] rounded-xl border border-neutral-200 bg-neutral-0 p-2 shadow-md">
          {!isSearching ? (
            <div className="flex flex-col gap-1">
              <button
                type="button"
                disabled={!savedAddress}
                onClick={handleSelectSaved}
                className={cn(
                  "flex items-start gap-3 rounded-lg p-2 text-left transition-colors",
                  savedAddress ? "hover:bg-neutral-50" : "cursor-not-allowed opacity-50"
                )}
              >
                <Icon icon={Home} size="sm" className="mt-0.5 shrink-0 text-neutral-400" />
                <span className="min-w-0">
                  <span className="block text-body-sm font-medium text-neutral-900">Saved address</span>
                  <span className="block truncate text-caption text-neutral-500">
                    {savedAddress ? savedAddress.formattedAddress : "No address saved yet — add one in your profile"}
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={handleSelectCurrent}
                className="flex items-start gap-3 rounded-lg p-2 text-left transition-colors hover:bg-neutral-50"
              >
                <Icon icon={Navigation} size="sm" className="mt-0.5 shrink-0 text-neutral-400" />
                <span className="min-w-0">
                  <span className="block text-body-sm font-medium text-neutral-900">Current location</span>
                  <span className="block truncate text-caption text-neutral-500">
                    {isLoadingCurrent ? "Detecting your location…" : currentError ?? "Use your device's GPS"}
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsSearching(true)}
                className="flex items-start gap-3 rounded-lg p-2 text-left transition-colors hover:bg-neutral-50"
              >
                <Icon icon={Search} size="sm" className="mt-0.5 shrink-0 text-neutral-400" />
                <span className="min-w-0">
                  <span className="block text-body-sm font-medium text-neutral-900">Search a location</span>
                  <span className="block truncate text-caption text-neutral-500">Find an address by name</span>
                </span>
              </button>
            </div>
          ) : (
            <div className="p-1">
              <AddressAutocomplete
                label="Search a location"
                placeholder="Start typing an address…"
                value={searchQuery}
                onChange={handleSearchQueryChange}
                suggestions={searchSuggestions}
                onSelectSuggestion={(s) => void handleSelectSuggestion(s)}
                isLoading={isLoadingSuggestions}
                error={suggestionsError}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
