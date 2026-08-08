"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Truck, Package, Clock, MapPin, Home, Navigation, Search } from "lucide-react";
import { AddressAutocomplete, type AddressSuggestion } from "@/components/AddressAutocomplete";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CategoryQuantityRow } from "@/components/CategoryQuantityRow";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Input } from "@/components/Input";
import { PageContainer } from "@/components/PageContainer";
import { PillRadioGroup } from "@/components/PillRadioGroup";
import { type SelectOption } from "@/components/Select";
import { StepProgress } from "@/components/StepProgress";
import { SummaryPanel, SummaryRow } from "@/components/SummaryPanel";
import { TimeSlotPicker, type TimeSlot } from "@/components/TimeSlotPicker";
import { WasteCategoryQuantityPicker } from "@/components/WasteCategoryQuantityPicker";
import { WasteCategorySelector, type WasteCategory } from "@/components/WasteCategorySelector";
import { AuthApiError } from "@/lib/api/auth";
import { fetchAddressSuggestions, fetchPlaceDetails, PlacesConfigError, fetchReverseGeocode, type PlaceDetails } from "@/lib/api/places";
import { getMyProfile, type UserProfile } from "@/lib/api/users";
import { cn } from "@/lib/utils";
import {
  createPickupRequest,
  LOAD_SIZE_KG_RANGES,
  LOAD_SIZE_LABELS,
  formatKgRange,
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

interface TimeWindow extends TimeSlot {
  startHour: number;
  endHour: number;
}

const TIME_WINDOWS: TimeWindow[] = [
  { id: "08:00-10:00", label: "08:00 - 10:00", startHour: 8, endHour: 10 },
  { id: "10:00-12:00", label: "10:00 - 12:00", startHour: 10, endHour: 12 },
  { id: "14:00-16:00", label: "14:00 - 16:00", startHour: 14, endHour: 16 },
  { id: "16:00-18:00", label: "16:00 - 18:00", startHour: 16, endHour: 18 },
];

const LOAD_SIZE_OPTIONS: SelectOption[] = [
  { value: "", label: "Select an estimated quantity…", disabled: true },
  ...(Object.keys(LOAD_SIZE_KG_RANGES) as LoadSize[]).map((size) => ({
    value: size,
    label: `${LOAD_SIZE_LABELS[size]} (${formatKgRange(size)})`,
  })),
];

const ADDRESS_DEBOUNCE_MS = 300;
const ADDRESS_MIN_QUERY_LENGTH = 3;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildTimeSlotIso(dateStr: string, hour: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, hour, 0, 0, 0).toISOString();
}

function formatWindowSummary(dateStr: string, window: TimeWindow): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const dateLabel = new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return `${dateLabel} · ${window.label}`;
}

export function NewPickupRequestView() {
  const router = useRouter();
  const [validationMessage, setValidationMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const [categories, setCategories] = React.useState<WasteCategory[]>([]);
  const [quantities, setQuantities] = React.useState<Partial<Record<WasteCategory, LoadSize>>>({});
  const [date, setDate] = React.useState("");
  const [timeWindowId, setTimeWindowId] = React.useState<string | null>(null);

  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [profileError, setProfileError] = React.useState<string | null>(null);

  const [addressMode, setAddressMode] = React.useState<"saved" | "custom" | "current">("saved");
  const [addressModeTouched, setAddressModeTouched] = React.useState(false);
  const [customAddressQuery, setCustomAddressQuery] = React.useState("");
  const [customAddressSuggestions, setCustomAddressSuggestions] = React.useState<AddressSuggestion[]>([]);
  const [isLoadingAddressSuggestions, setIsLoadingAddressSuggestions] = React.useState(false);
  const [addressSuggestionsError, setAddressSuggestionsError] = React.useState<string | null>(null);
  const [selectedCustomPlace, setSelectedCustomPlace] = React.useState<AddressSuggestion | null>(null);

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
  }

  const selectedWindow = TIME_WINDOWS.find((window) => window.id === timeWindowId) ?? null;
  const timeSlotStart = date && selectedWindow ? buildTimeSlotIso(date, selectedWindow.startHour) : null;
  const isSlotInPast = timeSlotStart !== null && new Date(timeSlotStart) < new Date();

  const resolvedPlaceId = 
    addressMode === "saved" ? (profile?.placeId ?? null) 
    : addressMode === "current" ? (currentLocationPlace?.placeId ?? null) 
    : (selectedCustomPlace?.placeId ?? null);
  const resolvedAddressLabel =
    addressMode === "saved" ? (profile?.formattedAddress ?? null) 
    : addressMode === "current" ? (currentLocationPlace?.formattedAddress ?? null) 
    : (selectedCustomPlace?.description ?? null);

  const hasQuantityForEveryCategory =
    categories.length > 0 && categories.every((category) => quantities[category] !== undefined);

  const canSubmit =
    !isSubmitting &&
    hasQuantityForEveryCategory &&
    date !== "" &&
    selectedWindow !== null &&
    !isSlotInPast &&
    resolvedPlaceId !== null;

  function handleQuantityChange(category: WasteCategory, loadSize: LoadSize) {
    setQuantities((prev) => ({ ...prev, [category]: loadSize }));
  }

  function handleCategoriesChange(nextCategories: WasteCategory[]) {
    setCategories(nextCategories);
    setQuantities((prev) => {
      const nextSet = new Set(nextCategories);
      const next: Partial<Record<WasteCategory, LoadSize>> = {};
      for (const category of Object.keys(prev) as WasteCategory[]) {
        if (nextSet.has(category)) next[category] = prev[category];
      }
      return next;
    });
  }



  async function handleSubmitPickupRequest() {
    if (!date || !selectedWindow || !resolvedPlaceId || !hasQuantityForEveryCategory) return;

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      let formattedAddress: string | undefined;
      let latitude: number | undefined;
      let longitude: number | undefined;

      if (addressMode === "saved" && profile && profile.formattedAddress && profile.latitude !== null && profile.longitude !== null) {
        formattedAddress = profile.formattedAddress;
        latitude = profile.latitude;
        longitude = profile.longitude;
      } else if (addressMode === "current" && currentLocationPlace) {
        formattedAddress = currentLocationPlace.formattedAddress;
        latitude = currentLocationPlace.latitude;
        longitude = currentLocationPlace.longitude;
      } else if (addressMode === "custom" && selectedCustomPlace) {
        const details = await fetchPlaceDetails(selectedCustomPlace.placeId);
        formattedAddress = details.formattedAddress;
        latitude = details.latitude;
        longitude = details.longitude;
      }

      await createPickupRequest({
        items: categories.map((category) => ({
          category,
          loadSize: quantities[category] as LoadSize,
        })),
        timeSlotStart: buildTimeSlotIso(date, selectedWindow.startHour),
        timeSlotEnd: buildTimeSlotIso(date, selectedWindow.endHour),
        placeId: resolvedPlaceId,
        formattedAddress,
        latitude,
        longitude,
      });
      router.push("/dashboard/pickups");
    } catch (err) {
      setSubmitError(resolveSubmitPickupErrorMessage(err));
      setIsSubmitting(false);
    }
  }

  return (
    <PageContainer className="py-8 lg:py-12">
      <div className="flex items-center gap-4 animate-slide-up">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-100 to-emerald-100 text-primary-600 shadow-sm border border-primary-100/50">
          <Icon icon={Truck} size="xl" />
        </div>
        <div>
          <h1 className="font-heading text-h1 text-neutral-900 tracking-tight">Schedule a pickup</h1>
          <p className="mt-2 text-body-lg text-neutral-500 max-w-xl">
            Tell us what you&apos;re recycling and when — we&apos;ll match you with a nearby collector.
          </p>
        </div>
      </div>

      {profileError && <ErrorBanner className="mt-4 max-w-form">{profileError}</ErrorBanner>}

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr] animate-slide-up">
        <div className="flex flex-col gap-6">
          
          {/* Section 1: Categories */}
          <Card className="glass-panel border-0 shadow-xl rounded-[2rem] p-8 relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
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
          <Card className="glass-panel border-0 shadow-xl rounded-[2rem] p-8 relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                <p className="text-body font-semibold text-neutral-900">Estimated quantity</p>
                <WasteCategoryQuantityPicker
                  categories={categories}
                  value={quantities}
                  onChange={handleQuantityChange}
                  loadSizeOptions={LOAD_SIZE_OPTIONS}
                />
              </div>

              <div className="h-px w-full bg-neutral-100" />

              <div className="flex flex-col gap-3">
                <p className="text-body font-semibold text-neutral-900">When should we come?</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-neutral-50/50 border border-neutral-100 rounded-xl p-5">
                  <Input
                    label="Pickup date"
                    type="date"
                    min={todayIsoDate()}
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="bg-white"
                  />
                  <div>
                    <p className="text-label text-neutral-800 mb-2">Time slot</p>
                    <TimeSlotPicker
                      slots={TIME_WINDOWS}
                      value={timeWindowId}
                      onChange={setTimeWindowId}
                      aria-label="Time slot"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6 sticky top-24 h-fit">
          {/* Section 3: Address */}
          <Card className="glass-panel border-0 shadow-xl rounded-[2rem] p-8 relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
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
            
            {validationMessage && <ErrorBanner className="mt-4">{validationMessage}</ErrorBanner>}
          </Card>

          <SummaryPanel
            title="Request summary"
            className="glass-panel border-0 shadow-2xl rounded-[2rem] bg-gradient-to-b from-white to-primary-50/20"
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
            <p className="text-body-sm text-neutral-500">Categories & quantities</p>
            <div className="mt-2 flex flex-col gap-2">
              {categories.length > 0 ? (
                categories.map((category) => {
                  const categoryLoadSize = quantities[category];
                  return (
                    <CategoryQuantityRow
                      key={category}
                      category={category}
                      quantityLabel={
                        categoryLoadSize
                          ? `${LOAD_SIZE_LABELS[categoryLoadSize]} (${formatKgRange(categoryLoadSize)})`
                          : null
                      }
                    />
                  );
                })
              ) : (
                <span className="text-body-sm text-neutral-500">Not selected yet</span>
              )}
            </div>
          </div>
          <SummaryRow
            label="Window"
            value={date && selectedWindow ? formatWindowSummary(date, selectedWindow) : "Not selected yet"}
          />
          <SummaryRow label="Address" value={resolvedAddressLabel ?? "Not selected yet"} />
        </SummaryPanel>
      </div>
      </div>
    </PageContainer>
  );
}
