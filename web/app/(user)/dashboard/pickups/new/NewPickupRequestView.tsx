"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AddressAutocomplete, type AddressSuggestion } from "@/components/AddressAutocomplete";
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
import {
  createPickupRequest,
  LOAD_SIZE_KG_RANGES,
  LOAD_SIZE_LABELS,
  formatKgRange,
  type LoadSize,
} from "@/lib/api/pickups";

const STEP_LABELS = ["Category", "Quantity & time", "Confirm"];

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
  const [step, setStep] = React.useState(0);
  const stepHeadingRef = React.useRef<HTMLHeadingElement | null>(null);
  const isInitialStepRender = React.useRef(true);
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

  React.useEffect(() => {
    if (isInitialStepRender.current) {
      isInitialStepRender.current = false;
      return;
    }
    stepHeadingRef.current?.focus();
  }, [step]);

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

  const isLastStep = step === STEP_LABELS.length - 1;
  const canSubmit =
    isLastStep &&
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

  function handleNext() {
    if (step === 0) {
      if (categories.length === 0) {
        setValidationMessage("Select at least one category to continue.");
        return;
      }
    }
    if (step === 1) {
      if (!hasQuantityForEveryCategory) {
        setValidationMessage("Choose an estimated quantity for every selected category.");
        return;
      }
      if (!date) {
        setValidationMessage("Choose a pickup date.");
        return;
      }
      if (!selectedWindow) {
        setValidationMessage("Choose a time slot.");
        return;
      }
      if (isSlotInPast) {
        setValidationMessage("That time slot has already passed — pick a later date or slot.");
        return;
      }
    }
    setValidationMessage(null);
    setStep((current) => Math.min(current + 1, STEP_LABELS.length - 1));
  }

  function handleBack() {
    setValidationMessage(null);
    setStep((current) => Math.max(current - 1, 0));
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
      <h1 className="text-h1 text-neutral-900">Schedule a pickup</h1>
      <p className="mt-2 text-body-lg text-neutral-500">
        Tell us what you&apos;re recycling and when — we&apos;ll match you with a nearby collector.
      </p>

      {profileError && <ErrorBanner className="mt-4 max-w-form">{profileError}</ErrorBanner>}

      <StepProgress steps={STEP_LABELS} currentIndex={step} aria-label="Pickup request progress" className="mt-8" />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          <Card>
            {step === 0 && (
              <>
                <h2
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className="text-h3 text-neutral-900 rounded-sm focus:outline-none focus:shadow-focus"
                >
                  What are you selling?
                </h2>
                <p className="mt-1 text-body-sm text-neutral-500">
                  Select every category that applies to this pickup.
                </p>
                <WasteCategorySelector
                  value={categories}
                  onChange={handleCategoriesChange}
                  aria-label="What are you selling?"
                  className="mt-5"
                />
              </>
            )}

            {step === 1 && (
              <>
                <h2
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className="text-h3 text-neutral-900 rounded-sm focus:outline-none focus:shadow-focus"
                >
                  Quantity & time
                </h2>
                <p className="mt-1 text-body-sm text-neutral-500">
                  Estimate how much you have of each category, and pick a pickup window.
                </p>
                <div className="mt-5 flex flex-col gap-5">
                  <div>
                    <p className="text-label text-neutral-800">Estimated quantity</p>
                    <WasteCategoryQuantityPicker
                      categories={categories}
                      value={quantities}
                      onChange={handleQuantityChange}
                      loadSizeOptions={LOAD_SIZE_OPTIONS}
                      className="mt-2"
                    />
                  </div>
                  <Input
                    label="Pickup date"
                    type="date"
                    min={todayIsoDate()}
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                  <div>
                    <p className="text-label text-neutral-800">Time slot</p>
                    <TimeSlotPicker
                      slots={TIME_WINDOWS}
                      value={timeWindowId}
                      onChange={setTimeWindowId}
                      aria-label="Time slot"
                      className="mt-2"
                    />
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className="text-h3 text-neutral-900 rounded-sm focus:outline-none focus:shadow-focus"
                >
                  Pickup address
                </h2>
                <p className="mt-1 text-body-sm text-neutral-500">Where should the collector pick this up?</p>

                <PillRadioGroup
                  options={[
                    { id: "saved", label: "Use my saved address", disabled: Boolean(profile) && !profile?.placeId },
                    { id: "current", label: "Use current location" },
                    { id: "custom", label: "Enter a different address" },
                  ]}
                  value={addressMode}
                  onChange={handleAddressModeChange}
                  aria-label="Pickup address option"
                  className="mt-4"
                />

                <div className="mt-4">
                  {addressMode === "saved" ? (
                    !profile ? (
                      <p className="text-body-sm text-neutral-500">Loading your saved address…</p>
                    ) : profile.placeId ? (
                      <p className="text-body-sm text-neutral-900">{profile.formattedAddress}</p>
                    ) : (
                      <p className="text-body-sm text-neutral-500">
                        You don&apos;t have a saved address yet — add one from your profile, or enter one below.
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
              </>
            )}

            {validationMessage && <ErrorBanner className="mt-4">{validationMessage}</ErrorBanner>}
          </Card>

          <div className="mt-6 flex items-center justify-between">
            <Button variant="secondary" onClick={handleBack} disabled={step === 0}>
              Back
            </Button>
            {!isLastStep ? (
              <Button onClick={handleNext}>Next</Button>
            ) : (
              <p className="text-body-sm text-neutral-500">Review your request, then post it from the summary.</p>
            )}
          </div>
        </div>

        <SummaryPanel
          title="Request summary"
          footer={
            <div className="flex flex-col gap-3">
              {submitError && <ErrorBanner>{submitError}</ErrorBanner>}
              <Button fullWidth disabled={!canSubmit} onClick={() => void handleSubmitPickupRequest()}>
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
    </PageContainer>
  );
}
