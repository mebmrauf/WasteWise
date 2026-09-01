"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Truck, Package, Clock, MapPin, Home, Navigation, Search } from "lucide-react";
import { AddressAutocomplete, type AddressSuggestion } from "@/components/AddressAutocomplete";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

import { ErrorBanner } from "@/components/ErrorBanner";
import { Input } from "@/components/Input";
import { PageContainer } from "@/components/PageContainer";
import { PillRadioGroup } from "@/components/PillRadioGroup";
import { Select } from "@/components/Select";
import { StepProgress } from "@/components/StepProgress";
import { getVerifiedCollectors, type CollectorDirectoryEntry } from "@/lib/api/collectors";
import { SummaryPanel, SummaryRow } from "@/components/SummaryPanel";
import { DatePicker } from "@/components/DatePicker";

import { WasteCategorySelector, type WasteCategory } from "@/components/WasteCategorySelector";
import { AuthApiError } from "@/lib/api/auth";
import { fetchAddressSuggestions, fetchPlaceDetails, PlacesConfigError, fetchReverseGeocode, type PlaceDetails } from "@/lib/api/places";
import { getMyProfile, type UserProfile } from "@/lib/api/users";
import { cn } from "@/lib/utils";
import {
  createPickupRequest,
  type LoadSize,
} from "@/lib/api/pickups";

// Flattened form: all steps are now displayed simultaneously.

const submitPickupErrorMessages: Record<string, string> = {
  VALIDATION_ERROR:
    "That address couldn't be verified — try selecting a suggestion from the list again, or check your pickup details.",
  GEOCODING_NOT_CONFIGURED: "Address lookup isn't available right now. Please try again later.",
  GEOCODING_FAILED: "Couldn't verify that address right now. Please try again.",
  FORBIDDEN: "Your account isn't able to request pickups.",
};

function resolveSubmitPickupErrorMessage(err: unknown): string {
  if (err instanceof AuthApiError) {
    return submitPickupErrorMessages[err.code] ?? "Something went wrong posting your request. Please try again.";
  }
  return "Something went wrong posting your request. Please try again.";
}



const ADDRESS_DEBOUNCE_MS = 300;
const ADDRESS_MIN_QUERY_LENGTH = 3;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildTimeSlotIso(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0).toISOString();
}

function formatWindowSummary(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function NewPickupRequestView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preferredCollectorId = searchParams.get("preferredCollectorId");
  const preferredCollectorName = searchParams.get("collectorName");
  const initialRadius = searchParams.get("radiusKm") ? Number(searchParams.get("radiusKm")) : 20;

  const [radiusKm, setRadiusKm] = React.useState<number>(initialRadius);

  const [validationMessage, setValidationMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [isExclusiveToPreferred, setIsExclusiveToPreferred] = React.useState(true);

  const [categories, setCategories] = React.useState<WasteCategory[]>([]);
  const [estimatedTotalWeight, setEstimatedTotalWeight] = React.useState<number | "">("");
  const [categoryWeights, setCategoryWeights] = React.useState<Record<string, string>>({});
  const [date, setDate] = React.useState("");


  const [localCollectors, setLocalCollectors] = React.useState<CollectorDirectoryEntry[]>([]);
  const [selectedCollectorId, setSelectedCollectorId] = React.useState<string>(preferredCollectorId || "");

  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [profileError, setProfileError] = React.useState<string | null>(null);

  const [addressMode, setAddressMode] = React.useState<"saved" | "custom" | "current">("saved");
  const [addressModeTouched, setAddressModeTouched] = React.useState(false);
  const [customAddressQuery, setCustomAddressQuery] = React.useState("");
  const [customAddressSuggestions, setCustomAddressSuggestions] = React.useState<AddressSuggestion[]>([]);
  const [isLoadingAddressSuggestions, setIsLoadingAddressSuggestions] = React.useState(false);
  const [addressSuggestionsError, setAddressSuggestionsError] = React.useState<string | null>(null);
  const [selectedCustomPlace, setSelectedCustomPlace] = React.useState<AddressSuggestion | null>(null);
  const [selectedCustomPlaceDetails, setSelectedCustomPlaceDetails] = React.useState<PlaceDetails | null>(null);

  const [currentLocationPlace, setCurrentLocationPlace] = React.useState<PlaceDetails | null>(null);
  const [isLoadingCurrentLocation, setIsLoadingCurrentLocation] = React.useState(false);
  const [currentLocationError, setCurrentLocationError] = React.useState<string | null>(null);

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
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof AuthApiError
            ? "Couldn't load your saved address. You can still enter one below."
            : "Couldn't load your profile. You can still enter an address below.";
        setProfileError(message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!addressModeTouched && profile && !profile.placeId) {
      setAddressMode("custom");
    }
  }, [profile, addressModeTouched]);

  React.useEffect(() => {
    return () => {
      if (addressDebounceTimerRef.current !== null) window.clearTimeout(addressDebounceTimerRef.current);
    };
  }, []);

  const resolvedLocation = React.useMemo<PlaceDetails | null>(() => {
    if (
      addressMode === "saved" &&
      profile?.placeId &&
      profile.formattedAddress &&
      profile.latitude !== null &&
      profile.longitude !== null
    ) {
      return {
        placeId: profile.placeId,
        formattedAddress: profile.formattedAddress,
        latitude: profile.latitude,
        longitude: profile.longitude,
      };
    }
    if (addressMode === "current" && currentLocationPlace) return currentLocationPlace;
    if (addressMode === "custom" && selectedCustomPlaceDetails) return selectedCustomPlaceDetails;
    return null;
  }, [addressMode, profile, currentLocationPlace, selectedCustomPlaceDetails]);

  React.useEffect(() => {
    if (resolvedLocation) {
      getVerifiedCollectors({ 
        lat: resolvedLocation.latitude, 
        lng: resolvedLocation.longitude,
        radiusKm: profile?.collectorFindRadiusKm ?? undefined
      })
        .then(setLocalCollectors)
        .catch(console.error);
    } else {
      setLocalCollectors([]);
    }
  }, [resolvedLocation, profile?.collectorFindRadiusKm]);



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

  function handleAddressModeChange(id: string) {
    setAddressModeTouched(true);
    setAddressMode(id as "saved" | "custom" | "current");
  }

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
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  React.useEffect(() => {
    if (addressMode === "current" && !currentLocationPlace && !isLoadingCurrentLocation && !currentLocationError) {
      handleDetectLocation();
    }
  }, [addressMode, currentLocationPlace, isLoadingCurrentLocation, currentLocationError, handleDetectLocation]);

  function handleCustomAddressQueryChange(nextQuery: string) {
    setCustomAddressQuery(nextQuery);
    setSelectedCustomPlace(null); // any manual edit invalidates a previously-picked suggestion
    setSelectedCustomPlaceDetails(null);

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

  function handleSelectCustomAddress(suggestion: AddressSuggestion) {
    if (addressDebounceTimerRef.current !== null) window.clearTimeout(addressDebounceTimerRef.current);
    addressRequestSeqRef.current += 1;
    addressSessionTokenRef.current = null; // the Autocomplete "session" ends once a pick is made
    setSelectedCustomPlace(suggestion);
    setCustomAddressQuery(suggestion.description);
    setCustomAddressSuggestions([]);
    setIsLoadingAddressSuggestions(false);
    setAddressSuggestionsError(null);
    setSelectedCustomPlaceDetails(null);
    fetchPlaceDetails(suggestion.placeId)
      .then(setSelectedCustomPlaceDetails)
      .catch(() => setAddressSuggestionsError("Couldn't resolve that address. Try selecting it again."));
  }

  const pickupDateIso = date ? buildTimeSlotIso(date) : null;
  const isSlotInPast = pickupDateIso !== null && new Date(pickupDateIso) < new Date(new Date().setHours(0,0,0,0));

  const resolvedPlaceId = resolvedLocation?.placeId ?? null;
  const resolvedAddressLabel = resolvedLocation?.formattedAddress ?? null;

  const isBusiness = true;

  const computedTotalWeight = React.useMemo(() => {
    if (!isBusiness) return typeof estimatedTotalWeight === "number" ? estimatedTotalWeight : 0;
    
    let total = 0;
    for (const cat of categories) {
      const weight = parseFloat(categoryWeights[cat] || "0");
      if (!isNaN(weight)) total += weight;
    }
    return total;
  }, [categories, categoryWeights, isBusiness, estimatedTotalWeight]);

  const canSubmit =
    !isSubmitting &&
    categories.length > 0 &&
    (isBusiness ? computedTotalWeight > 0 : estimatedTotalWeight !== "") &&
    date !== "" &&
    !isSlotInPast &&
    resolvedPlaceId !== null;

  function handleCategoriesChange(nextCategories: WasteCategory[]) {
    setCategories(nextCategories);
    setCategoryWeights(prev => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (!nextCategories.includes(key as WasteCategory)) {
          delete next[key];
        }
      }
      return next;
    });
  }



  async function handleSubmitPickupRequest() {
    if (!date || !resolvedPlaceId || categories.length === 0 || (!isBusiness && estimatedTotalWeight === "")) return;

    if (computedTotalWeight >= 50) {
      setSubmitError("This request qualifies as a Bulk Waste Pickup. Please use the Bulk Waste Pickup feature instead.");
      return;
    }
    if (computedTotalWeight < 1) {
      setSubmitError("Please enter a valid weight of at least 1 kg.");
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const payload = {
        items: categories.map((category) => ({
          category,
          loadSize: "SMALL" as LoadSize,
          exactWeightKg: isBusiness && categoryWeights[category] ? parseFloat(categoryWeights[category]) : undefined,
        })),
        pickupDate: buildTimeSlotIso(date),
        placeId: resolvedPlaceId,
        formattedAddress: resolvedLocation?.formattedAddress,
        latitude: resolvedLocation?.latitude,
        longitude: resolvedLocation?.longitude,
        ...(selectedCollectorId ? {
          preferredCollectorId: selectedCollectorId,
          isExclusiveToPreferred
        } : {}),
        radiusKm,
        estimatedTotalWeight: computedTotalWeight
      };

      await createPickupRequest(payload);
      router.push("/business/dashboard/pickups");
    } catch (err) {
      setSubmitError(resolveSubmitPickupErrorMessage(err));
      setIsSubmitting(false);
    }
  }

  return (
    <PageContainer className="py-8 lg:py-12">
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-emerald-100 p-8 mb-8 rounded-2xl shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Schedule a pickup</h1>
        <p className="mt-2 text-neutral-600">
          Tell us what you&apos;re recycling and when — we&apos;ll match you with a nearby collector.
        </p>
      </Card>

      {profileError && <ErrorBanner className="mt-4 max-w-form">{profileError}</ErrorBanner>}



      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr] animate-slide-up">
        <div className="flex flex-col gap-6">
          
          {/* Section 1: Categories */}
          <Card className="p-6 md:p-8 bg-white rounded-2xl shadow-sm border border-neutral-100 transition-all">
            <div className="flex items-center gap-5 mb-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 shadow-inner">
                <Icon icon={Package} size="lg" />
              </div>
              <div>
                <h2 className="font-heading text-h3 text-neutral-900">What are you selling?</h2>
                <p className="mt-1 text-body-sm text-neutral-500">Select every category that applies to this pickup.</p>
              </div>
            </div>
            <WasteCategorySelector
              value={categories}
              onChange={handleCategoriesChange}
              aria-label="What are you selling?"
              className="mt-5"
            />
          </Card>

          {/* Section 2: Quantity & Time */}
          <Card className="p-6 md:p-8 bg-white rounded-2xl shadow-sm border border-neutral-100 transition-all">
            <div className="flex items-center gap-5 mb-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 shadow-inner">
                <Icon icon={Clock} size="lg" />
              </div>
              <div>
                <h2 className="font-heading text-h3 text-neutral-900">Quantity & time</h2>
                <p className="mt-1 text-body-sm text-neutral-500">Estimate how much you have of each category, and pick a pickup window.</p>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-end mb-2">
                  <p className="text-body font-semibold text-neutral-900">Estimated Weight</p>
                  {isBusiness && computedTotalWeight > 0 && (
                    <span className="text-body-sm font-semibold text-primary-600 bg-primary-50 px-3 py-1 rounded-full">
                      Total: {computedTotalWeight} kg
                    </span>
                  )}
                </div>

                {isBusiness ? (
                  categories.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center">
                      <p className="text-body-sm text-neutral-500">Select materials above to enter their weights.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 rounded-xl border border-neutral-100 bg-neutral-50/50 p-4">
                      {categories.map((cat) => (
                        <div key={cat} className="flex items-center justify-between gap-4">
                          <label className="text-body-sm font-medium text-neutral-700 capitalize">
                            {cat.toLowerCase()} Weight (kg)
                          </label>
                          <Input
                            type="number"
                            min="0.1"
                            step="0.1"
                            placeholder="e.g. 5"
                            value={categoryWeights[cat] || ""}
                            onChange={(e) => setCategoryWeights(prev => ({ ...prev, [cat]: e.target.value }))}
                            className="bg-white w-32"
                          />
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <Input
                    type="number"
                    min="1"
                    max="49"
                    step="0.1"
                    placeholder="e.g. 12.5"
                    value={estimatedTotalWeight}
                    onChange={(e) => setEstimatedTotalWeight(e.target.value === "" ? "" : Number(e.target.value))}
                    className="bg-white"
                  />
                )}
              </div>

              <div className="h-px w-full bg-neutral-100" />

              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-neutral-50/50 border border-neutral-100 rounded-xl p-5">
                  <DatePicker
                    label="Pickup date"
                    min={todayIsoDate()}
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6 sticky top-24 h-fit">
          {/* Section 3: Address */}
          <Card className="p-6 md:p-8 bg-white rounded-2xl shadow-sm border border-neutral-100 transition-all">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 shadow-inner">
                <Icon icon={MapPin} size="md" />
              </div>
              <div>
                <h2 className="font-heading text-h3 text-neutral-900 leading-tight">Pickup address</h2>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {/* Option: Saved Address */}
              <button
                type="button"
                disabled={Boolean(profile) && !profile?.placeId}
                onClick={() => handleAddressModeChange("saved")}
                className={cn(
                  "flex items-center gap-4 w-full p-4 rounded-xl border text-left transition-all",
                  "focus-visible:outline-none focus-visible:shadow-focus",
                  Boolean(profile) && !profile?.placeId
                    ? "opacity-50 cursor-not-allowed border-neutral-100 bg-neutral-50"
                    : addressMode === "saved"
                    ? "border-primary-500 bg-primary-50/50 shadow-sm"
                    : "border-neutral-200 bg-white hover:border-primary-300 hover:bg-primary-50/20"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full",
                  addressMode === "saved" ? "bg-primary-100 text-primary-600" : "bg-neutral-100 text-neutral-500"
                )}>
                  <Icon icon={Home} size="sm" />
                </div>
                <div>
                  <p className={cn("text-body font-semibold", addressMode === "saved" ? "text-primary-900" : "text-neutral-900")}>
                    Saved Address
                  </p>
                  <p className="text-label text-neutral-500">
                    Use the address from your profile
                  </p>
                </div>
              </button>

              {/* Option: Current Location */}
              <button
                type="button"
                onClick={() => handleAddressModeChange("current")}
                className={cn(
                  "flex items-center gap-4 w-full p-4 rounded-xl border text-left transition-all",
                  "focus-visible:outline-none focus-visible:shadow-focus",
                  addressMode === "current"
                    ? "border-primary-500 bg-primary-50/50 shadow-sm"
                    : "border-neutral-200 bg-white hover:border-primary-300 hover:bg-primary-50/20"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full",
                  addressMode === "current" ? "bg-primary-100 text-primary-600" : "bg-neutral-100 text-neutral-500"
                )}>
                  <Icon icon={Navigation} size="sm" />
                </div>
                <div>
                  <p className={cn("text-body font-semibold", addressMode === "current" ? "text-primary-900" : "text-neutral-900")}>
                    Current Location
                  </p>
                  <p className="text-label text-neutral-500">
                    Use your device&apos;s GPS
                  </p>
                </div>
              </button>

              {/* Option: Custom Address */}
              <button
                type="button"
                onClick={() => handleAddressModeChange("custom")}
                className={cn(
                  "flex items-center gap-4 w-full p-4 rounded-xl border text-left transition-all",
                  "focus-visible:outline-none focus-visible:shadow-focus",
                  addressMode === "custom"
                    ? "border-primary-500 bg-primary-50/50 shadow-sm"
                    : "border-neutral-200 bg-white hover:border-primary-300 hover:bg-primary-50/20"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full",
                  addressMode === "custom" ? "bg-primary-100 text-primary-600" : "bg-neutral-100 text-neutral-500"
                )}>
                  <Icon icon={Search} size="sm" />
                </div>
                <div>
                  <p className={cn("text-body font-semibold", addressMode === "custom" ? "text-primary-900" : "text-neutral-900")}>
                    Different Address
                  </p>
                  <p className="text-label text-neutral-500">
                    Search for a new location
                  </p>
                </div>
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-neutral-100">
              {addressMode === "saved" ? (
                !profile ? (
                  <p className="text-body-sm text-neutral-500">Loading your saved address…</p>
                ) : profile.placeId ? (
                  <p className="text-body-sm text-neutral-900">{profile.formattedAddress}</p>
                ) : (
                  <p className="text-body-sm text-neutral-500">
                    You don&apos;t have a saved address yet. Add one from your profile, or enter a different one below.
                  </p>
                )
              ) : addressMode === "current" ? (
                <div className="flex flex-col gap-3">
                  {currentLocationError && <ErrorBanner>{currentLocationError}</ErrorBanner>}
                  {!currentLocationPlace ? (
                    <div className="flex flex-col items-start gap-2">
                      <p className="text-body-sm text-neutral-500">We&apos;ll use your device&apos;s GPS to find your address.</p>
                      {isLoadingCurrentLocation && (
                        <p className="text-body-sm text-neutral-500">Detecting location…</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-start gap-2">
                      <p className="text-body-sm text-neutral-900">{currentLocationPlace.formattedAddress}</p>
                    </div>
                  )}
                </div>
              ) : (
                <AddressAutocomplete
                  label="Address"
                  placeholder="Start typing your address…"
                  value={customAddressQuery}
                  onChange={handleCustomAddressQueryChange}
                  suggestions={customAddressSuggestions}
                  onSelectSuggestion={handleSelectCustomAddress}
                  isLoading={isLoadingAddressSuggestions}
                  error={addressSuggestionsError}
                />
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t border-neutral-100 flex flex-col gap-4">
              {preferredCollectorId ? (
                <div className="p-4 bg-primary-50 rounded-xl border border-primary-100">
                  <h3 className="font-semibold text-primary-900 mb-1">
                    Requesting from {preferredCollectorName ?? "this collector"}
                  </h3>
                  <p className="text-body-sm text-primary-800 mb-4">
                    Send it only to this collector, or open it up to every nearby verified collector.
                  </p>
                  <PillRadioGroup
                    aria-label="Request scope"
                    options={[
                      { id: "exclusive", label: `Only ${preferredCollectorName ?? "this collector"}` },
                      { id: "broadcast", label: "Broadcast to everyone" },
                    ]}
                    value={isExclusiveToPreferred ? "exclusive" : "broadcast"}
                    onChange={(id) => setIsExclusiveToPreferred(id === "exclusive")}
                  />
                  {!isExclusiveToPreferred && (
                    <div className="mt-4 pt-4 border-t border-primary-200">
                      <label className="text-body-sm font-semibold text-primary-900 mb-2 block">
                        Broadcast Radius ({radiusKm} km)
                      </label>
                      <p className="text-caption text-primary-800 mb-2">
                        We will notify all verified collectors within this range.
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={5}
                          max={50}
                          step={1}
                          value={radiusKm}
                          onChange={(e) => setRadiusKm(Number(e.target.value))}
                          className="flex-1 accent-primary-600"
                        />
                        <span className="w-12 text-right text-body-sm font-medium text-primary-900">
                          {radiusKm} km
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                resolvedLocation && localCollectors.length > 0 && (
                  <div className="p-4 bg-primary-50 rounded-xl border border-primary-100">
                    <h3 className="font-semibold text-primary-900 mb-2">Optional: Request a Specific Collector</h3>
                    <p className="text-body-sm text-primary-800 mb-4">
                      Choose a highly-rated collector near you to send this request directly to them.
                    </p>
                    <Select
                      label="Preferred Collector"
                      value={selectedCollectorId}
                      onChange={(e) => setSelectedCollectorId(e.target.value)}
                      options={[
                        { value: "", label: "Broadcast to everyone (Default)" },
                        ...localCollectors.map(col => ({
                          value: col.id,
                          label: `${col.fullName} - ⭐ ${col.averageRating ? col.averageRating.toFixed(1) : "New"}`
                        }))
                      ]}
                    />
                    {selectedCollectorId && (
                      <label className="flex items-center gap-2 mt-4 text-body-sm text-neutral-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isExclusiveToPreferred}
                          onChange={(e) => setIsExclusiveToPreferred(e.target.checked)}
                          className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
                        />
                        Send this request ONLY to the selected collector.
                      </label>
                    )}

                    {(!selectedCollectorId || !isExclusiveToPreferred) && (
                      <div className="mt-4 pt-4 border-t border-primary-200">
                        <label className="text-body-sm font-semibold text-primary-900 mb-2 block">
                          Broadcast Radius ({radiusKm} km)
                        </label>
                        <p className="text-caption text-primary-800 mb-2">
                          We will notify all verified collectors within this range.
                        </p>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={5}
                            max={50}
                            step={1}
                            value={radiusKm}
                            onChange={(e) => setRadiusKm(Number(e.target.value))}
                            className="flex-1 accent-primary-600"
                          />
                          <span className="w-12 text-right text-body-sm font-medium text-primary-900">
                            {radiusKm} km
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>

            {validationMessage && <ErrorBanner className="mt-4">{validationMessage}</ErrorBanner>}
          </Card>

          <SummaryPanel
            title="Request summary"
            className="p-6 md:p-8 bg-white rounded-2xl shadow-sm border border-neutral-100 transition-all"
            footer={
            <div className="flex flex-col gap-3">
              {submitError && <ErrorBanner>{submitError}</ErrorBanner>}
              <Button fullWidth disabled={!canSubmit} onClick={() => void handleSubmitPickupRequest()} className="rounded-full h-12 shadow-md hover:shadow-lg transition-all text-body font-bold">
                {isSubmitting ? "Posting request…" : "Post pickup request"}
              </Button>
            </div>
          }
        >
          <div>
            <p className="text-body-sm text-neutral-500">Categories & estimated weight</p>
            <div className="mt-2 flex flex-col gap-2">
              {categories.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <span key={category} className="px-3 py-1 bg-neutral-100 rounded-full text-body-sm font-medium text-neutral-700">
                        {category}
                      </span>
                    ))}
                  </div>
                  {estimatedTotalWeight !== "" && (
                    <p className="text-body-sm font-semibold text-neutral-900 mt-2">
                      Total Weight: {estimatedTotalWeight} kg
                    </p>
                  )}
                </div>
              ) : (
                <span className="text-body-sm text-neutral-500">Not selected yet</span>
              )}
            </div>
          </div>
          <SummaryRow
            label="Window"
            value={date ? formatWindowSummary(date) : "Not selected yet"}
          />
          <SummaryRow label="Address" value={resolvedAddressLabel ?? "Not selected yet"} />
        </SummaryPanel>
      </div>
      </div>
    </PageContainer>
  );
}
