"use client";

import * as React from "react";
import { AvatarUpload } from "@/components/AvatarUpload";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ChangePasswordSection } from "@/components/ChangePasswordSection";
import { DeleteAccountSection } from "@/components/DeleteAccountSection";
import { Divider } from "@/components/Divider";
import { EditableField } from "@/components/EditableField";
import { ErrorBanner } from "@/components/ErrorBanner";
import { FieldDisplayRow } from "@/components/FieldDisplayRow";
import { Input } from "@/components/Input";
import { PageContainer } from "@/components/PageContainer";
import { Select } from "@/components/Select";
import { StatusPill } from "@/components/StatusPill";
import { AddressAutocomplete, type AddressSuggestion } from "@/components/AddressAutocomplete";
import { Map } from "@/components/Map";
import { fetchAddressSuggestions, fetchPlaceDetails, fetchReverseGeocode, PlacesConfigError } from "@/lib/api/places";
import { useRequireRole } from "@/lib/auth/AuthContext";
import { AuthApiError } from "@/lib/api/auth";
import {
  getMyProfile,
  updateMyProfile,
  updateCollectorProfile,
  uploadMyAvatar,
  resolveAvatarUrl,
  type CollectorProfileSummary,
  type UpdateProfileInput,
} from "@/lib/api/users";
import { VEHICLE_TYPE_LABELS, type VehicleType } from "@/lib/vehicleType";
import { VERIFICATION_STATUS_TONE, VERIFICATION_STATUS_LABEL } from "@/lib/verificationStatus";
import { ALL_SERVICE_AREAS } from "@/lib/areas";

const profileErrorMessages: Record<string, string> = {
  VALIDATION_ERROR: "Please check that value and try again.",
  PHONE_IN_USE: "That phone number is already linked to another account.",
  UNSUPPORTED_FILE_TYPE: "Please upload a JPEG, PNG, or WEBP image.",
  FILE_TOO_LARGE: "Image must be smaller than 2MB.",
  FILE_REQUIRED: "Please choose an image to upload.",
};

function resolveProfileErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AuthApiError) {
    return profileErrorMessages[err.code] ?? fallback;
  }
  return fallback;
}

const vehicleTypeOptions = (Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[]).map((value) => ({
  value,
  label: VEHICLE_TYPE_LABELS[value],
}));

const DEFAULT_VEHICLE_TYPE: VehicleType = "MOTORCYCLE_VAN";

interface ProfileExtras {
  avatarUrl: string | null;
  collectorProfile: CollectorProfileSummary | null;
  emailNotificationsEnabled: boolean;
  rewardsEmailNotificationsEnabled: boolean;
}

const notificationPreferenceKeys = {
  email: "emailNotificationsEnabled",
  rewardsEmail: "rewardsEmailNotificationsEnabled",
} as const;

interface FieldSaveState {
  isSaving: boolean;
  error: string | null;
}

const idleSaveState: FieldSaveState = { isSaving: false, error: null };

interface CollectorDetailsDraft {
  vehicleType: VehicleType;
  vehicleNumber: string;
  licenseNumber: string;
  serviceArea: string;
}

function draftFromProfile(profile: CollectorProfileSummary | null): CollectorDetailsDraft {
  return {
    vehicleType: profile?.vehicleType ?? DEFAULT_VEHICLE_TYPE,
    vehicleNumber: profile?.vehicleNumber ?? "",
    licenseNumber: profile?.licenseNumber ?? "",
    serviceArea: profile?.serviceArea ?? "",
  };
}

interface ServiceAreaLocation {
  placeId: string;
  formattedAddress: string;
  lat: number;
  lng: number;
}

const DEFAULT_SERVICE_RADIUS_KM = 5;
const MIN_SERVICE_RADIUS_KM = 1;
const MAX_SERVICE_RADIUS_KM = 100;

function serviceAreaLocationFromProfile(profile: CollectorProfileSummary | null): ServiceAreaLocation | null {
  if (
    !profile?.serviceAreaPlaceId ||
    !profile.serviceAreaFormattedAddress ||
    profile.serviceAreaLatitude === null ||
    profile.serviceAreaLongitude === null
  ) {
    return null;
  }
  return {
    placeId: profile.serviceAreaPlaceId,
    formattedAddress: profile.serviceAreaFormattedAddress,
    lat: profile.serviceAreaLatitude,
    lng: profile.serviceAreaLongitude,
  };
}

export function CollectorProfileView() {
  const { user, isLoading, refetchUser } = useRequireRole(["COLLECTOR"]);

  const [fullName, setFullName] = React.useState(user?.fullName ?? "");
  const [phone, setPhone] = React.useState(user?.phone ?? "");

  React.useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phone ?? "");
    }
  }, [user]);

  const [extras, setExtras] = React.useState<ProfileExtras | null>(null);
  const [extrasError, setExtrasError] = React.useState<string | null>(null);

  const [details, setDetails] = React.useState<CollectorDetailsDraft>(draftFromProfile(null));
  const [serviceAreaLocation, setServiceAreaLocation] = React.useState<ServiceAreaLocation | null>(null);
  const [serviceAreaRadiusKm, setServiceAreaRadiusKm] = React.useState<number>(DEFAULT_SERVICE_RADIUS_KM);
  const [isLocatingServiceArea, setIsLocatingServiceArea] = React.useState(false);
  const [serviceAreaLocateError, setServiceAreaLocateError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;

    setExtrasError(null);
    getMyProfile()
      .then(({ user: profile }) => {
        if (cancelled) return;
        setExtras({
          avatarUrl: resolveAvatarUrl(profile.avatarUrl),
          collectorProfile: profile.collectorProfile,
          emailNotificationsEnabled: profile.emailNotificationsEnabled,
          rewardsEmailNotificationsEnabled: profile.rewardsEmailNotificationsEnabled,
        });
        setDetails(draftFromProfile(profile.collectorProfile));
        const savedLocation = serviceAreaLocationFromProfile(profile.collectorProfile);
        setServiceAreaLocation(savedLocation);
        setServiceAreaRadiusKm(profile.collectorProfile?.serviceAreaRadiusKm ?? DEFAULT_SERVICE_RADIUS_KM);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setExtrasError(
          resolveProfileErrorMessage(err, "Couldn't load your profile details. Try refreshing the page."),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const [fullNameSave, setFullNameSave] = React.useState<FieldSaveState>(idleSaveState);
  const [phoneSave, setPhoneSave] = React.useState<FieldSaveState>(idleSaveState);
  const [notificationError, setNotificationError] = React.useState<string | null>(null);
  const [avatarUploadState, setAvatarUploadState] = React.useState<{
    isUploading: boolean;
    error: string | null;
  }>({ isUploading: false, error: null });

  const [addressSuggestions, setAddressSuggestions] = React.useState<AddressSuggestion[]>([]);
  const [isLoadingAddressSuggestions, setIsLoadingAddressSuggestions] = React.useState(false);
  const [addressSuggestionsError, setAddressSuggestionsError] = React.useState<string | null>(null);
  const addressSessionTokenRef = React.useRef<string | null>(null);
  const addressDebounceTimerRef = React.useRef<number | null>(null);
  const addressRequestSeqRef = React.useRef(0);

  React.useEffect(() => {
    return () => {
      if (addressDebounceTimerRef.current !== null) {
        window.clearTimeout(addressDebounceTimerRef.current);
      }
    };
  }, []);

  function ensureAddressSessionToken(): string {
    if (!addressSessionTokenRef.current) {
      addressSessionTokenRef.current = crypto.randomUUID();
    }
    return addressSessionTokenRef.current;
  }

  function rotateAddressSessionToken() {
    addressSessionTokenRef.current = crypto.randomUUID();
  }

  function clearPendingAddressDebounce() {
    if (addressDebounceTimerRef.current !== null) {
      window.clearTimeout(addressDebounceTimerRef.current);
      addressDebounceTimerRef.current = null;
    }
  }

  async function runAddressSuggestionsFetch(query: string) {
    const seq = ++addressRequestSeqRef.current;
    setIsLoadingAddressSuggestions(true);
    setAddressSuggestionsError(null);
    try {
      const token = ensureAddressSessionToken();
      const results = await fetchAddressSuggestions(query, token);
      if (seq !== addressRequestSeqRef.current) return;
      setAddressSuggestions(results);
      setIsLoadingAddressSuggestions(false);
    } catch (err) {
      if (seq !== addressRequestSeqRef.current) return;
      setAddressSuggestions([]);
      setIsLoadingAddressSuggestions(false);
      setAddressSuggestionsError(
        err instanceof PlacesConfigError
          ? "Address search isn't available right now."
          : "Couldn't load address suggestions. Try again.",
      );
    }
  }

  function handleAddressQueryChange(nextQuery: string) {
    setDetails((prev) => ({ ...prev, serviceArea: nextQuery }));
    clearPendingAddressDebounce();

    const trimmed = nextQuery.trim();
    if (trimmed.length < 3) {
      addressRequestSeqRef.current += 1;
      setAddressSuggestions([]);
      setIsLoadingAddressSuggestions(false);
      setAddressSuggestionsError(null);
      return;
    }

    addressDebounceTimerRef.current = window.setTimeout(() => {
      void runAddressSuggestionsFetch(trimmed);
    }, 400);
  }

  async function handleSelectAddressSuggestion(suggestion: AddressSuggestion) {
    clearPendingAddressDebounce();
    addressRequestSeqRef.current += 1;
    rotateAddressSessionToken();
    setDetails((prev) => ({ ...prev, serviceArea: suggestion.description }));
    setAddressSuggestions([]);
    setIsLoadingAddressSuggestions(false);
    setAddressSuggestionsError(null);
    setServiceAreaLocateError(null);

    try {
      const details = await fetchPlaceDetails(suggestion.placeId);
      if (details.latitude && details.longitude) {
        setServiceAreaLocation({
          placeId: details.placeId,
          formattedAddress: details.formattedAddress,
          lat: details.latitude,
          lng: details.longitude,
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleServiceAreaMapClick(position: { lat: number; lng: number }) {
    // Optimistically move the marker, then resolve a real address for it —
    // this is what makes the map draggable/clickable rather than fixed to
    // whatever the last text search returned.
    setServiceAreaLocation((prev) => (prev ? { ...prev, lat: position.lat, lng: position.lng } : prev));
    setIsLocatingServiceArea(true);
    setServiceAreaLocateError(null);
    try {
      const resolved = await fetchReverseGeocode(position.lat, position.lng);
      setServiceAreaLocation({
        placeId: resolved.placeId,
        formattedAddress: resolved.formattedAddress,
        lat: resolved.latitude,
        lng: resolved.longitude,
      });
      setDetails((prev) => ({ ...prev, serviceArea: resolved.formattedAddress }));
      setIsLocatingServiceArea(false);
    } catch (err) {
      console.error(err);
      setIsLocatingServiceArea(false);
      setServiceAreaLocateError("Couldn't look up that spot on the map. Try clicking again.");
    }
  }

  const [detailsSave, setDetailsSave] = React.useState<FieldSaveState>(idleSaveState);
  const savedDetails = draftFromProfile(extras?.collectorProfile ?? null);
  const savedServiceAreaLocation = serviceAreaLocationFromProfile(extras?.collectorProfile ?? null);
  const savedServiceAreaRadiusKm = extras?.collectorProfile?.serviceAreaRadiusKm ?? DEFAULT_SERVICE_RADIUS_KM;
  const detailsChanged =
    details.vehicleType !== savedDetails.vehicleType ||
    details.vehicleNumber !== savedDetails.vehicleNumber ||
    details.licenseNumber !== savedDetails.licenseNumber ||
    details.serviceArea !== savedDetails.serviceArea ||
    serviceAreaLocation?.placeId !== savedServiceAreaLocation?.placeId ||
    (serviceAreaLocation !== null && serviceAreaRadiusKm !== savedServiceAreaRadiusKm);

  const hasRequiredDetails =
    details.vehicleNumber.trim().length > 0 &&
    details.licenseNumber.trim().length > 0 &&
    details.serviceArea.trim().length > 0;

  async function handleToggleNotification(kind: keyof typeof notificationPreferenceKeys, checked: boolean) {
    if (!extras) return;
    const previous = extras;
    const key = notificationPreferenceKeys[kind];
    setNotificationError(null);
    setExtras({ ...extras, [key]: checked });
    try {
      await updateMyProfile({ [key]: checked } as UpdateProfileInput);
    } catch (err) {
      setExtras(previous);
      setNotificationError(resolveProfileErrorMessage(err, "Couldn't save that preference. Try again."));
    }
  }

  async function handleSaveFullName(newValue: string) {
    setFullNameSave({ isSaving: true, error: null });
    try {
      const { user: updated } = await updateMyProfile({ fullName: newValue });
      setFullName(updated.fullName);
      setFullNameSave({ isSaving: false, error: null });
      void refetchUser();
    } catch (err) {
      setFullNameSave({
        isSaving: false,
        error: resolveProfileErrorMessage(err, "Couldn't save your name. Try again."),
      });
    }
  }

  async function handleSavePhone(newValue: string) {
    setPhoneSave({ isSaving: true, error: null });
    try {
      const { user: updated } = await updateMyProfile({ phone: newValue });
      setPhone(updated.phone ?? "");
      setPhoneSave({ isSaving: false, error: null });
    } catch (err) {
      setPhoneSave({
        isSaving: false,
        error: resolveProfileErrorMessage(err, "Couldn't save your phone number. Try again."),
      });
    }
  }

  async function handleAvatarFileSelected(file: File) {
    setAvatarUploadState({ isUploading: true, error: null });
    try {
      const { user: updated } = await uploadMyAvatar(file);
      setExtras((prev) => (prev ? { ...prev, avatarUrl: resolveAvatarUrl(updated.avatarUrl) } : prev));
      setAvatarUploadState({ isUploading: false, error: null });
    } catch (err) {
      setAvatarUploadState({
        isUploading: false,
        error: resolveProfileErrorMessage(err, "Couldn't upload that photo. Try again."),
      });
    }
  }

  async function handleSaveDetails() {
    setDetailsSave({ isSaving: true, error: null });
    try {
      const { collectorProfile: updated } = await updateCollectorProfile({
        vehicleType: details.vehicleType,
        vehicleNumber: details.vehicleNumber,
        licenseNumber: details.licenseNumber,
        serviceArea: details.serviceArea,
        ...(serviceAreaLocation
          ? {
              serviceAreaPlaceId: serviceAreaLocation.placeId,
              serviceAreaFormattedAddress: serviceAreaLocation.formattedAddress,
              serviceAreaLatitude: serviceAreaLocation.lat,
              serviceAreaLongitude: serviceAreaLocation.lng,
              serviceAreaRadiusKm,
            }
          : {}),
      });
      setExtras((prev) => (prev ? { ...prev, collectorProfile: updated } : prev));
      setDetails(draftFromProfile(updated));
      setServiceAreaLocation(serviceAreaLocationFromProfile(updated));
      setServiceAreaRadiusKm(updated.serviceAreaRadiusKm ?? DEFAULT_SERVICE_RADIUS_KM);
      setDetailsSave({ isSaving: false, error: null });
    } catch (err) {
      setDetailsSave({
        isSaving: false,
        error: resolveProfileErrorMessage(err, "Couldn't save your collector details. Try again."),
      });
    }
  }

  if (isLoading) {
    return (
      <PageContainer className="flex min-h-[60vh] items-center justify-center py-16">
        <p className="text-body-sm text-neutral-500">Loading your profile…</p>
      </PageContainer>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <PageContainer className="py-8 lg:py-12">
      <div className="flex flex-col gap-8 w-full max-w-4xl">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-emerald-100 p-8 mb-8 rounded-2xl shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Your Profile</h1>
          <p className="mt-2 text-neutral-600">
            Manage your contact details, vehicle, and service area.
          </p>
        </Card>

        {extrasError && <ErrorBanner className="w-full">{extrasError}</ErrorBanner>}

        <Card className="p-6 md:p-8 bg-white rounded-2xl shadow-sm border border-neutral-100 transition-all w-full">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <AvatarUpload
            name={user.fullName}
            currentSrc={extras?.avatarUrl ?? null}
            accent="collector"
            isUploading={avatarUploadState.isUploading}
            error={avatarUploadState.error}
            onFileSelected={handleAvatarFileSelected}
          />

          <div>
            <FieldDisplayRow label="Email" value={user.email} />
            <p className="mt-1 text-caption text-neutral-500">
              Tied to your account — can&apos;t be changed here.
            </p>
          </div>

          <FieldDisplayRow label="Account Type" value="🚚 Collector" />
        </div>

        <Divider label="Profile details" className="my-6" />

        <div className="flex flex-col gap-5">
          <EditableField
            label="Full name"
            value={fullName}
            onSave={handleSaveFullName}
            isSaving={fullNameSave.isSaving}
            errorText={fullNameSave.error}
          />
          <EditableField
            label="Phone"
            value={phone}
            type="tel"
            placeholder="Not set"
            onSave={handleSavePhone}
            isSaving={phoneSave.isSaving}
            errorText={phoneSave.error}
          />
        </div>

        <Divider label="Collector details" className="my-6" />

        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-label text-neutral-800">Verification status</span>
            {extras?.collectorProfile ? (
              <StatusPill tone={VERIFICATION_STATUS_TONE[extras.collectorProfile.verificationStatus]}>
                {VERIFICATION_STATUS_LABEL[extras.collectorProfile.verificationStatus]}
              </StatusPill>
            ) : (
              <span className="text-body-sm text-neutral-500">
                {extras ? "Not set up yet" : "Loading…"}
              </span>
            )}
          </div>
          {extras && !extras.collectorProfile ? (
            <p className="-mt-2 text-caption text-neutral-500">
              Save your vehicle details below to complete your collector profile — an admin
              reviews it before you can browse available jobs.
            </p>
          ) : (
            <p className="-mt-2 text-caption text-warning-600 bg-warning-50 p-3 rounded-lg border border-warning-200">
              <strong>Note:</strong> Updating your vehicle or license details will instantly lock your account and require an admin to re-verify you.
            </p>
          )}

          <Select
            label="Vehicle type"
            value={details.vehicleType}
            disabled={!extras || detailsSave.isSaving}
            onChange={(event) =>
              setDetails((prev) => ({ ...prev, vehicleType: event.target.value as VehicleType }))
            }
            options={vehicleTypeOptions}
          />
          <Input
            label="Vehicle number"
            value={details.vehicleNumber}
            placeholder="e.g. DHK-1234"
            disabled={!extras || detailsSave.isSaving}
            onChange={(event) => setDetails((prev) => ({ ...prev, vehicleNumber: event.target.value }))}
          />
          <Input
            label="License number"
            value={details.licenseNumber}
            placeholder="e.g. LIC-987654321"
            disabled={!extras || detailsSave.isSaving}
            onChange={(event) => setDetails((prev) => ({ ...prev, licenseNumber: event.target.value }))}
          />
          <div>
            <AddressAutocomplete
              label="Service area base location"
              value={details.serviceArea}
              disabled={!extras || detailsSave.isSaving}
              onChange={handleAddressQueryChange}
              suggestions={addressSuggestions}
              onSelectSuggestion={(suggestion) => void handleSelectAddressSuggestion(suggestion)}
              isLoading={isLoadingAddressSuggestions}
              error={addressSuggestionsError}
            />
            <p className="mt-1 text-label text-neutral-500">
              Search for your base location to drop a pin, then click anywhere on the map to fine-tune it. Pickup requests within your radius will notify you automatically.
            </p>
            {serviceAreaLocation && (
              <div className="mt-4 space-y-3">
                <div className="relative h-48 w-full overflow-hidden rounded-lg sm:h-64 border border-neutral-200 shadow-inner">
                  <Map
                    center={{ lat: serviceAreaLocation.lat, lng: serviceAreaLocation.lng }}
                    zoom={12}
                    marker={{ lat: serviceAreaLocation.lat, lng: serviceAreaLocation.lng }}
                    circleRadiusMeters={serviceAreaRadiusKm * 1000}
                    onMapClick={handleServiceAreaMapClick}
                  />
                  {isLocatingServiceArea && (
                    <div className="absolute right-2 top-2 rounded-md bg-neutral-0/90 px-2 py-1 text-label text-neutral-600 shadow-sm">
                      Locating…
                    </div>
                  )}
                </div>
                {serviceAreaLocateError && (
                  <p className="text-body-sm text-error-700">{serviceAreaLocateError}</p>
                )}
                <div className="flex items-center gap-3">
                  <label htmlFor="service-area-radius" className="text-label text-neutral-800 whitespace-nowrap">
                    Coverage radius
                  </label>
                  <input
                    id="service-area-radius"
                    type="range"
                    min={MIN_SERVICE_RADIUS_KM}
                    max={MAX_SERVICE_RADIUS_KM}
                    step={1}
                    value={serviceAreaRadiusKm}
                    disabled={detailsSave.isSaving}
                    onChange={(event) => setServiceAreaRadiusKm(Number(event.target.value))}
                    className="flex-1 accent-primary-600"
                  />
                  <span className="w-16 text-right text-body-sm font-medium text-neutral-800">
                    {serviceAreaRadiusKm} km
                  </span>
                </div>
              </div>
            )}
          </div>

          {detailsSave.error && <ErrorBanner>{detailsSave.error}</ErrorBanner>}

          <div>
            <Button
              size="sm"
              disabled={!extras || !detailsChanged || !hasRequiredDetails || detailsSave.isSaving}
              onClick={() => void handleSaveDetails()}
            >
              {detailsSave.isSaving ? "Saving…" : "Save collector details"}
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <ChangePasswordSection hasPassword={user.hasPassword} />
        <DeleteAccountSection hasPassword={user.hasPassword} />
      </div>

      <Card className="p-6 md:p-8 bg-white rounded-2xl shadow-sm border border-neutral-100 transition-all w-full">
        <h3 className="text-xl font-bold text-neutral-900 mb-6">Notification Preferences</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 text-body text-neutral-900 cursor-pointer p-3 rounded-xl hover:bg-neutral-50 transition-colors">
            <input
              type="checkbox"
              className="h-5 w-5 accent-primary-600 rounded shrink-0"
              checked={extras?.emailNotificationsEnabled ?? false}
              disabled={!extras}
              onChange={(event) => void handleToggleNotification("email", event.target.checked)}
            />
            Email me about job offers &amp; pickup updates
          </label>
          <label className="flex items-center gap-3 text-body text-neutral-900 cursor-pointer p-3 rounded-xl hover:bg-neutral-50 transition-colors">
            <input
              type="checkbox"
              className="h-5 w-5 accent-primary-600 rounded shrink-0"
              checked={extras?.rewardsEmailNotificationsEnabled ?? false}
              disabled={!extras}
              onChange={(event) => void handleToggleNotification("rewardsEmail", event.target.checked)}
            />
            Email me about ratings &amp; recognition
          </label>
        </div>
        {!extras && (
          <p className="text-caption text-neutral-500 mt-4">Loading your saved preferences…</p>
        )}
        {notificationError && <ErrorBanner className="mt-4">{notificationError}</ErrorBanner>}
      </Card>
      </div>
    </PageContainer>
  );
}
