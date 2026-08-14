"use client";

import * as React from "react";
import { PageContainer } from "@/components/PageContainer";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { ErrorBanner } from "@/components/ErrorBanner";
import { AddressAutocomplete, type AddressSuggestion } from "@/components/AddressAutocomplete";
import { BadgeCheck, Star, Truck, User, Home, Navigation, Search, MapPin, ChevronDown, Phone } from "lucide-react";
import { VEHICLE_TYPE_LABELS, type VehicleType } from "@/lib/vehicleType";
import { getVerifiedCollectors, type CollectorDirectoryEntry, type CollectorSortBy } from "@/lib/api/collectors";
import { getMyProfile, resolveAvatarUrl, type UserProfile } from "@/lib/api/users";
import { fetchAddressSuggestions, fetchPlaceDetails, fetchReverseGeocode, PlacesConfigError, type PlaceDetails } from "@/lib/api/places";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

const SEARCH_RADIUS_KM = 20;
const ADDRESS_DEBOUNCE_MS = 300;
const ADDRESS_MIN_QUERY_LENGTH = 3;

interface FilterOption<T extends string> {
  value: T;
  label: string;
  shortLabel?: string;
}

const RATING_FILTER_OPTIONS: FilterOption<string>[] = [
  { value: "ANY", label: "Any rating", shortLabel: "Any" },
  { value: "3", label: "3+ stars", shortLabel: "3+" },
  { value: "4", label: "4+ stars", shortLabel: "4+" },
  { value: "4.5", label: "4.5+ stars", shortLabel: "4.5+" },
];

const SORT_OPTIONS: FilterOption<CollectorSortBy>[] = [
  { value: "distance", label: "Distance (nearest first)", shortLabel: "Nearest first" },
  { value: "rating", label: "Rating (highest first)", shortLabel: "Highest rated" },
];

type LocationMode = "saved" | "current" | "custom";
type OpenPanel = "location" | "vehicle" | "rating" | "sort" | null;

function FilterChip<T extends string>({
  keyLabel,
  options,
  value,
  onChange,
  isOpen,
  onOpenChange,
  isActive,
  align = "left",
}: {
  keyLabel: string;
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isActive: boolean;
  align?: "left" | "right";
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);
  const tinted = isActive || isOpen;

  React.useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onOpenChange(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onOpenChange]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => onOpenChange(!isOpen)}
        className={cn(
          "flex min-h-[50px] items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-body-sm transition-colors",
          "focus-visible:outline-none focus-visible:shadow-focus",
          tinted
            ? "border-primary-300 bg-primary-50 text-primary-800"
            : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300",
        )}
      >
        <span className="flex items-center gap-2">
          <span className={cn("text-neutral-400", tinted && "text-primary-600")}>{keyLabel}</span>
          <span className={cn("font-semibold", tinted ? "text-primary-800" : "text-neutral-700")}>
            {selected?.shortLabel ?? selected?.label}
          </span>
        </span>
        <Icon icon={ChevronDown} size="sm" className={cn("text-neutral-400", tinted && "text-primary-600")} />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute top-[calc(100%+8px)] z-20 min-w-[220px] rounded-xl border border-neutral-200 bg-white p-2 shadow-lg",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                onOpenChange(false);
              }}
              className={cn(
                "flex w-full items-center rounded-md px-3 py-2 text-left text-body-sm transition-colors",
                option.value === value ? "bg-primary-50 font-medium text-primary-800" : "text-neutral-700 hover:bg-neutral-50",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CollectorsDirectoryView() {
  const [vehicleType, setVehicleType] = React.useState<VehicleType | "ALL">("ALL");
  const [minRating, setMinRating] = React.useState("ANY");
  const [sortBy, setSortBy] = React.useState<CollectorSortBy>("distance");
  const [collectors, setCollectors] = React.useState<CollectorDirectoryEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const [openPanel, setOpenPanel] = React.useState<OpenPanel>(null);
  const locationRef = React.useRef<HTMLDivElement>(null);

  const [locationMode, setLocationMode] = React.useState<LocationMode>("saved");
  const [locationModeTouched, setLocationModeTouched] = React.useState(false);
  const [showLocationModePicker, setShowLocationModePicker] = React.useState(true);

  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [profileError, setProfileError] = React.useState<string | null>(null);

  const [currentLocationPlace, setCurrentLocationPlace] = React.useState<PlaceDetails | null>(null);
  const [isLoadingCurrentLocation, setIsLoadingCurrentLocation] = React.useState(false);
  const [currentLocationError, setCurrentLocationError] = React.useState<string | null>(null);

  const [customAddressQuery, setCustomAddressQuery] = React.useState("");
  const [customAddressSuggestions, setCustomAddressSuggestions] = React.useState<AddressSuggestion[]>([]);
  const [isLoadingAddressSuggestions, setIsLoadingAddressSuggestions] = React.useState(false);
  const [addressSuggestionsError, setAddressSuggestionsError] = React.useState<string | null>(null);
  const [customPlaceDetails, setCustomPlaceDetails] = React.useState<PlaceDetails | null>(null);

  const addressSessionTokenRef = React.useRef<string | null>(null);
  const addressDebounceTimerRef = React.useRef<number | null>(null);
  const addressRequestSeqRef = React.useRef(0);

  React.useEffect(() => {
    let cancelled = false;
    getMyProfile()
      .then(({ user }) => {
        if (cancelled) return;
        setProfile(user);
      })
      .catch(() => {
        if (cancelled) return;
        setProfileError("Couldn't load your saved address. You can still search for a location below.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!locationModeTouched && profile && !profile.placeId) {
      setLocationMode("custom");
    }
  }, [profile, locationModeTouched]);

  React.useEffect(() => {
    if (openPanel === "location") setShowLocationModePicker(true);
  }, [openPanel]);

  React.useEffect(() => {
    if (openPanel !== "location") return;
    function handlePointerDown(event: MouseEvent) {
      if (locationRef.current && !locationRef.current.contains(event.target as Node)) setOpenPanel(null);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenPanel(null);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openPanel]);

  const handleDetectLocation = React.useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setCurrentLocationError("Geolocation isn't supported by this browser.");
      return;
    }
    setIsLoadingCurrentLocation(true);
    setCurrentLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchReverseGeocode(position.coords.latitude, position.coords.longitude)
          .then((place) => {
            setCurrentLocationPlace(place);
            setIsLoadingCurrentLocation(false);
          })
          .catch((err: unknown) => {
            setCurrentLocationError(err instanceof Error ? err.message : "Couldn't detect your address.");
            setIsLoadingCurrentLocation(false);
          });
      },
      (err) => {
        setCurrentLocationError(`Couldn't get your location (${err.message}). Make sure permissions are granted.`);
        setIsLoadingCurrentLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, []);

  React.useEffect(() => {
    if (locationMode === "current" && !currentLocationPlace && !isLoadingCurrentLocation && !currentLocationError) {
      handleDetectLocation();
    }
  }, [locationMode, currentLocationPlace, isLoadingCurrentLocation, currentLocationError, handleDetectLocation]);

  function handleLocationModeChange(mode: LocationMode) {
    setLocationModeTouched(true);
    setLocationMode(mode);
    if (mode !== "custom") {
      setOpenPanel(null);
    } else {
      setShowLocationModePicker(false);
    }
  }

  function ensureAddressSessionToken(): string {
    if (!addressSessionTokenRef.current) {
      addressSessionTokenRef.current = crypto.randomUUID();
    }
    return addressSessionTokenRef.current;
  }

  async function runAddressSuggestionsFetch(query: string) {
    const seq = ++addressRequestSeqRef.current;
    setIsLoadingAddressSuggestions(true);
    setAddressSuggestionsError(null);
    try {
      const token = ensureAddressSessionToken();
      const results = await fetchAddressSuggestions(query, token);
      if (seq !== addressRequestSeqRef.current) return;
      setCustomAddressSuggestions(results);
      setIsLoadingAddressSuggestions(false);
    } catch (err) {
      if (seq !== addressRequestSeqRef.current) return;
      setCustomAddressSuggestions([]);
      setIsLoadingAddressSuggestions(false);
      setAddressSuggestionsError(
        err instanceof PlacesConfigError
          ? "Address search isn't available right now."
          : "Couldn't load address suggestions. Try again.",
      );
    }
  }

  function handleCustomAddressQueryChange(nextQuery: string) {
    setCustomAddressQuery(nextQuery);
    setCustomPlaceDetails(null);
    if (addressDebounceTimerRef.current !== null) window.clearTimeout(addressDebounceTimerRef.current);

    const trimmed = nextQuery.trim();
    if (trimmed.length < ADDRESS_MIN_QUERY_LENGTH) {
      addressRequestSeqRef.current += 1;
      setCustomAddressSuggestions([]);
      setIsLoadingAddressSuggestions(false);
      setAddressSuggestionsError(null);
      return;
    }

    addressDebounceTimerRef.current = window.setTimeout(() => {
      void runAddressSuggestionsFetch(trimmed);
    }, ADDRESS_DEBOUNCE_MS);
  }

  async function handleSelectCustomAddress(suggestion: AddressSuggestion) {
    if (addressDebounceTimerRef.current !== null) window.clearTimeout(addressDebounceTimerRef.current);
    addressRequestSeqRef.current += 1;
    addressSessionTokenRef.current = null;
    setCustomAddressQuery(suggestion.description);
    setCustomAddressSuggestions([]);
    setIsLoadingAddressSuggestions(false);
    setAddressSuggestionsError(null);

    try {
      const details = await fetchPlaceDetails(suggestion.placeId);
      setCustomPlaceDetails(details);
      setOpenPanel(null);
    } catch (err) {
      console.error(err);
      setAddressSuggestionsError("Couldn't look up that address. Try again.");
    }
  }

  const activeLatitude =
    locationMode === "saved" ? profile?.latitude ?? null
    : locationMode === "current" ? currentLocationPlace?.latitude ?? null
    : customPlaceDetails?.latitude ?? null;
  const activeLongitude =
    locationMode === "saved" ? profile?.longitude ?? null
    : locationMode === "current" ? currentLocationPlace?.longitude ?? null
    : customPlaceDetails?.longitude ?? null;

  React.useEffect(() => {
    if (activeLatitude === null || activeLongitude === null) {
      setCollectors([]);
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);

    getVerifiedCollectors({
      latitude: activeLatitude,
      longitude: activeLongitude,
      vehicleType: vehicleType !== "ALL" ? vehicleType : undefined,
      minRating: minRating !== "ANY" ? Number(minRating) : undefined,
      sortBy,
    })
      .then((data) => {
        if (active) {
          setCollectors(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeLatitude, activeLongitude, vehicleType, minRating, sortBy]);

  const vehicleOptions: FilterOption<VehicleType | "ALL">[] = [
    { value: "ALL", label: "All vehicles" },
    ...(Object.entries(VEHICLE_TYPE_LABELS) as [VehicleType, string][]).map(([value, label]) => ({ value, label })),
  ];

  const locationOptions: { mode: LocationMode; icon: typeof Home; title: string; disabled?: boolean }[] = [
    { mode: "saved", icon: Home, title: "Saved address", disabled: Boolean(profile) && !profile?.placeId },
    { mode: "current", icon: Navigation, title: "Current location" },
    { mode: "custom", icon: Search, title: "Search a location" },
  ];

  const activeLocationIcon = locationOptions.find((option) => option.mode === locationMode)?.icon ?? Home;

  const locationChipLabel =
    locationMode === "saved" ? (
      !profile ? "Loading your saved address…"
      : profile.placeId ? profile.formattedAddress
      : "Add your saved address"
    ) : locationMode === "current" ? (
      currentLocationPlace ? currentLocationPlace.formattedAddress
      : isLoadingCurrentLocation ? "Detecting your location…"
      : "Use your current location"
    ) : (
      customPlaceDetails ? customPlaceDetails.formattedAddress : "Search a location…"
    );

  return (
    <PageContainer className="py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-display text-neutral-900 mb-2 font-bold tracking-tight">Find a Collector</h1>
        <p className="text-body-lg text-neutral-600 max-w-2xl">
          Browse verified independent collectors within {SEARCH_RADIUS_KM} km of your location.
        </p>
      </div>

      {profileError && <ErrorBanner className="mb-4">{profileError}</ErrorBanner>}

      {/* Location & filters toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-[420px]" ref={locationRef}>
          <button
            type="button"
            onClick={() => {
              if (openPanel !== "location") {
                setOpenPanel("location");
              } else if (locationMode === "custom" && !showLocationModePicker) {
                setShowLocationModePicker(true);
              } else {
                setOpenPanel(null);
              }
            }}
            className={cn(
              "flex min-h-[68px] w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
              "focus-visible:outline-none focus-visible:shadow-focus",
              openPanel === "location"
                ? "border-primary-400 shadow-focus"
                : "border-neutral-200 bg-neutral-50 hover:border-neutral-300",
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
              <Icon icon={activeLocationIcon} size="sm" />
            </span>
            <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-neutral-900">{locationChipLabel}</span>
            <Icon icon={ChevronDown} size="sm" className="shrink-0 text-neutral-400" />
          </button>

          {openPanel === "location" && (
            <div className="absolute left-0 top-[calc(100%+8px)] z-20 w-full rounded-xl border border-neutral-200 bg-white p-2 shadow-lg">
              {locationMode === "custom" && !showLocationModePicker ? (
                <>
                  <AddressAutocomplete
                    placeholder="Start typing a location…"
                    value={customAddressQuery}
                    onChange={handleCustomAddressQueryChange}
                    suggestions={customAddressSuggestions}
                    onSelectSuggestion={(suggestion) => void handleSelectCustomAddress(suggestion)}
                    isLoading={isLoadingAddressSuggestions}
                    error={addressSuggestionsError}
                  />
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    {locationOptions.map(({ mode, icon, title, disabled }) => (
                      <button
                        key={mode}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleLocationModeChange(mode)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-3 text-left text-body-sm font-medium transition-colors",
                          "focus-visible:outline-none focus-visible:shadow-focus",
                          disabled
                            ? "cursor-not-allowed text-neutral-300"
                            : locationMode === mode
                            ? "bg-primary-50 text-primary-800"
                            : "text-neutral-700 hover:bg-neutral-50",
                        )}
                      >
                        <Icon icon={icon} size="sm" className={locationMode === mode ? "text-primary-600" : "text-neutral-400"} />
                        {title}
                      </button>
                    ))}
                  </div>

                  {locationMode !== "custom" && (
                    <div className="mt-1 border-t border-neutral-100 pt-2">
                      <div className="flex items-center gap-3 px-3 py-2">
                        <Icon icon={MapPin} size="sm" className="shrink-0 text-neutral-400" />
                        <span className="truncate text-body-sm text-neutral-700">{locationChipLabel}</span>
                      </div>
                      {locationMode === "current" && currentLocationError && (
                        <ErrorBanner className="mt-2">{currentLocationError}</ErrorBanner>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterChip
            keyLabel="Vehicle"
            options={vehicleOptions}
            value={vehicleType}
            onChange={setVehicleType}
            isOpen={openPanel === "vehicle"}
            onOpenChange={(open) => setOpenPanel(open ? "vehicle" : null)}
            isActive={vehicleType !== "ALL"}
          />
          <FilterChip
            keyLabel="Rating"
            options={RATING_FILTER_OPTIONS}
            value={minRating}
            onChange={setMinRating}
            isOpen={openPanel === "rating"}
            onOpenChange={(open) => setOpenPanel(open ? "rating" : null)}
            isActive={minRating !== "ANY"}
          />
          <FilterChip
            keyLabel="Sort"
            options={SORT_OPTIONS}
            value={sortBy}
            onChange={setSortBy}
            isOpen={openPanel === "sort"}
            onOpenChange={(open) => setOpenPanel(open ? "sort" : null)}
            isActive
            align="right"
          />
        </div>
      </div>

      {/* Results */}
      {activeLatitude === null || activeLongitude === null ? (
        <div className="text-center py-20 bg-neutral-50 rounded-2xl border border-neutral-100 shadow-sm">
          <div className="flex justify-center mb-4 text-green-600">
            <Icon icon={BadgeCheck} size="xl" />
          </div>
          <h3 className="text-h4 text-neutral-900 font-medium mb-2">Find Local Collectors</h3>
          <p className="text-neutral-500 max-w-sm mx-auto">Pick a location above to find verified independent collectors near you.</p>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-neutral-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : collectors.length === 0 ? (
        <div className="text-center py-20 bg-neutral-50 rounded-2xl border border-neutral-100">
          <div className="flex justify-center mb-4 text-neutral-400">
            <Icon icon={User} size="xl" />
          </div>
          <h3 className="text-h4 text-neutral-900 font-medium mb-2">No collectors found</h3>
          <p className="text-neutral-500">No verified collectors within {SEARCH_RADIUS_KM} km of this location yet. Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {collectors.map((collector) => (
            <Card key={collector.id} className="flex flex-col p-6 shadow-sm hover:border-green-300 transition-colors bg-white">
              <div className="flex items-start gap-4 mb-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-full border border-neutral-200 shrink-0">
                  {collector.avatarUrl ? (
                    <Image
                      src={resolveAvatarUrl(collector.avatarUrl) as string}
                      alt={collector.fullName}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-400">
                      <Icon icon={User} size="lg" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-neutral-900 leading-tight line-clamp-1">{collector.fullName}</h3>
                    <Icon icon={BadgeCheck} className="text-green-500 shrink-0" size="sm" />
                  </div>
                  <div className="flex items-center gap-2 text-caption text-neutral-600">
                    <span className="flex items-center gap-1">
                      <Icon icon={Star} size="sm" className="text-yellow-500" />
                      <span className="font-medium text-neutral-900">{collector.averageRating?.toFixed(1) || "New"}</span>
                      {collector.totalRatings > 0 && <span>({collector.totalRatings})</span>}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 mb-6">
                <div className="flex items-center gap-2 text-body-sm text-neutral-700 bg-neutral-50 p-2 rounded-lg">
                  <Icon icon={Truck} size="sm" className="text-neutral-400" />
                  {VEHICLE_TYPE_LABELS[collector.vehicleType]}
                </div>
                {collector.phone && (
                  <div className="flex items-center gap-2 text-body-sm text-neutral-700 bg-neutral-50 p-2 rounded-lg">
                    <Icon icon={Phone} size="sm" className="text-neutral-400" />
                    {collector.phone}
                  </div>
                )}
              </div>

              <div className="mt-auto pt-4 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-caption font-medium text-green-700 bg-green-50 px-2 py-1 rounded-md">
                  {collector.distanceKm !== null ? `${collector.distanceKm.toFixed(1)} km away` : "All areas"}
                </span>
                <Link href={`/dashboard/pickups/new?preferredCollectorId=${collector.id}&collectorName=${encodeURIComponent(collector.fullName)}`}>
                  <Button variant="secondary" size="sm" className="text-green-800">
                    Request
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
