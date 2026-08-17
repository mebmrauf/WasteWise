"use client";

import * as React from "react";
import { User, Award, AlertCircle, CheckCircle2 } from "lucide-react";
import { AvatarUpload } from "@/components/AvatarUpload";
import { AddressAutocomplete, type AddressSuggestion } from "@/components/AddressAutocomplete";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ChangePasswordSection } from "@/components/ChangePasswordSection";
import { DeleteAccountSection } from "@/components/DeleteAccountSection";
import { Divider } from "@/components/Divider";
import { EditableField } from "@/components/EditableField";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Icon } from "@/components/Icon";
import { FieldDisplayRow } from "@/components/FieldDisplayRow";
import { PageContainer } from "@/components/PageContainer";
import { useRequireRole } from "@/lib/auth/AuthContext";
import { AuthApiError } from "@/lib/api/auth";
import { fetchAddressSuggestions, fetchPlaceDetails, PlacesConfigError } from "@/lib/api/places";
import {
  getMyProfile,
  updateMyProfile,
  uploadMyAvatar,
  resolveAvatarUrl,
  updateBusinessProfile,
  type UpdateProfileInput,
  type BusinessProfileSummary,
} from "@/lib/api/users";

const profileErrorMessages: Record<string, string> = {
  VALIDATION_ERROR: "Please check that value and try again.",
  PHONE_IN_USE: "That phone number is already linked to another account.",
  UNSUPPORTED_FILE_TYPE: "Please upload a JPEG, PNG, or WEBP image.",
  FILE_TOO_LARGE: "Image must be smaller than 10MB.",
  FILE_REQUIRED: "Please choose an image to upload.",
  GEOCODING_NOT_CONFIGURED: "Address lookup isn't available right now. Please try again later.",
  GEOCODING_FAILED: "Couldn't verify that address right now. Please try again.",
};

function resolveProfileErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AuthApiError) {
    return profileErrorMessages[err.code] ?? fallback;
  }
  return fallback;
}

const ADDRESS_DEBOUNCE_MS = 300;
const ADDRESS_MIN_QUERY_LENGTH = 3;

interface ProfileExtras {
  formattedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  avatarUrl: string | null;
  emailNotificationsEnabled: boolean;
  rewardsEmailNotificationsEnabled: boolean;
}

interface FieldSaveState {
  isSaving: boolean;
  error: string | null;
}

const idleSaveState: FieldSaveState = { isSaving: false, error: null };

export function ProfileView() {
  const { user, isLoading, refetchUser } = useRequireRole(["USER"], { allowedAccountTypes: ["BUSINESS"] });

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
  const [businessProfile, setBusinessProfile] = React.useState<BusinessProfileSummary | null>(null);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;

    setExtrasError(null);
    getMyProfile()
      .then(({ user: profile }) => {
        if (cancelled) return;
        setExtras({
          formattedAddress: profile.formattedAddress,
          latitude: profile.latitude,
          longitude: profile.longitude,
          placeId: profile.placeId,
          avatarUrl: resolveAvatarUrl(profile.avatarUrl),
          emailNotificationsEnabled: profile.emailNotificationsEnabled,
          rewardsEmailNotificationsEnabled: profile.rewardsEmailNotificationsEnabled,
        });
        setBusinessProfile(profile.businessProfile);
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
  const [businessNameSave, setBusinessNameSave] = React.useState<FieldSaveState>(idleSaveState);
  const [tradeLicenseSave, setTradeLicenseSave] = React.useState<FieldSaveState>(idleSaveState);

  const [isEditingAddress, setIsEditingAddress] = React.useState(false);
  const [addressQuery, setAddressQuery] = React.useState("");
  const [addressSuggestions, setAddressSuggestions] = React.useState<AddressSuggestion[]>([]);
  const [isLoadingAddressSuggestions, setIsLoadingAddressSuggestions] = React.useState(false);
  const [addressSuggestionsError, setAddressSuggestionsError] = React.useState<string | null>(null);
  const [addressSave, setAddressSave] = React.useState<FieldSaveState>(idleSaveState);

  const addressSessionTokenRef = React.useRef<string | null>(null);
  const addressDebounceTimerRef = React.useRef<number | null>(null);
  const addressRequestSeqRef = React.useRef(0);
  const addressEditButtonRef = React.useRef<HTMLButtonElement>(null);
  const wasEditingAddressRef = React.useRef(false);

  React.useEffect(() => {
    return () => {
      if (addressDebounceTimerRef.current !== null) {
        window.clearTimeout(addressDebounceTimerRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (isEditingAddress) {
      wasEditingAddressRef.current = true;
      return;
    }
    if (wasEditingAddressRef.current) {
      wasEditingAddressRef.current = false;
      addressEditButtonRef.current?.focus();
    }
  }, [isEditingAddress]);

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
    setAddressQuery(nextQuery);
    setAddressSave(idleSaveState);
    clearPendingAddressDebounce();

    const trimmed = nextQuery.trim();
    if (trimmed.length < ADDRESS_MIN_QUERY_LENGTH) {
      addressRequestSeqRef.current += 1;
      setAddressSuggestions([]);
      setIsLoadingAddressSuggestions(false);
      setAddressSuggestionsError(null);
      return;
    }

    addressDebounceTimerRef.current = window.setTimeout(() => {
      void runAddressSuggestionsFetch(trimmed);
    }, ADDRESS_DEBOUNCE_MS);
  }

  function handleEditAddress() {
    ensureAddressSessionToken();
    setAddressQuery(extras?.formattedAddress ?? "");
    setAddressSuggestions([]);
    setAddressSuggestionsError(null);
    setAddressSave(idleSaveState);
    setIsEditingAddress(true);
  }

  function handleCancelAddress() {
    clearPendingAddressDebounce();
    addressRequestSeqRef.current += 1;
    rotateAddressSessionToken();
    setAddressSuggestions([]);
    setIsLoadingAddressSuggestions(false);
    setAddressSuggestionsError(null);
    setAddressSave(idleSaveState);
    setIsEditingAddress(false);
  }

  async function handleSelectAddressSuggestion(suggestion: AddressSuggestion) {
    clearPendingAddressDebounce();
    addressRequestSeqRef.current += 1;
    rotateAddressSessionToken();
    setAddressQuery(suggestion.description);
    setAddressSuggestions([]);
    setIsLoadingAddressSuggestions(false);
    setAddressSuggestionsError(null);
    setAddressSave({ isSaving: true, error: null });
    try {
      const details = await fetchPlaceDetails(suggestion.placeId);
      const { user: updated } = await updateMyProfile({
        placeId: details.placeId,
        formattedAddress: details.formattedAddress,
        latitude: details.latitude,
        longitude: details.longitude,
      });
      setExtras((prev) =>
        prev
          ? {
              ...prev,
              formattedAddress: updated.formattedAddress,
              latitude: updated.latitude,
              longitude: updated.longitude,
              placeId: updated.placeId,
            }
          : prev,
      );
      setAddressSave({ isSaving: false, error: null });
      setIsEditingAddress(false);
    } catch (err) {
      setAddressSave({
        isSaving: false,
        error: resolveProfileErrorMessage(err, "Couldn't save that address. Try again."),
      });
    }
  }

  const [avatarUploadState, setAvatarUploadState] = React.useState<{
    isUploading: boolean;
    error: string | null;
  }>({ isUploading: false, error: null });
  const [notificationError, setNotificationError] = React.useState<string | null>(null);

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

  async function handleSaveBusinessName(newValue: string) {
    setBusinessNameSave({ isSaving: true, error: null });
    try {
      const { businessProfile: updated } = await updateBusinessProfile({ businessName: newValue });
      setBusinessProfile(updated);
      setBusinessNameSave({ isSaving: false, error: null });
    } catch (err) {
      setBusinessNameSave({
        isSaving: false,
        error: resolveProfileErrorMessage(err, "Couldn't save your business name. Try again."),
      });
    }
  }

  async function handleSaveTradeLicense(newValue: string) {
    setTradeLicenseSave({ isSaving: true, error: null });
    try {
      const { businessProfile: updated } = await updateBusinessProfile({
        tradeLicenseNumber: newValue.trim() ? newValue : null,
      });
      setBusinessProfile(updated);
      setTradeLicenseSave({ isSaving: false, error: null });
    } catch (err) {
      setTradeLicenseSave({
        isSaving: false,
        error: resolveProfileErrorMessage(err, "Couldn't save your trade license number. Try again."),
      });
    }
  }

  async function handleToggleCsr(checked: boolean) {
    if (!businessProfile) return;
    const previous = { ...businessProfile };
    try {
      setBusinessProfile({ ...businessProfile, askForCsrContribution: checked });
      await updateBusinessProfile({ askForCsrContribution: checked });
    } catch (err) {
      setBusinessProfile(previous);
      alert("Couldn't save CSR preference. Try again.");
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

  const notificationPreferenceKeys = {
    email: "emailNotificationsEnabled",
    rewardsEmail: "rewardsEmailNotificationsEnabled",
  } as const;

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
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-emerald-100 p-8 mb-8 rounded-2xl shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Your Profile</h1>
        <p className="mt-2 text-neutral-600">
          Manage your contact details, address, avatar, and notification preferences.
        </p>
      </Card>

      {businessProfile && (
        <div
          className={`mt-6 p-4 rounded-xl border flex items-start gap-4 ${
            businessProfile.verificationStatus === "APPROVED"
              ? "bg-emerald-50 border-emerald-200"
              : businessProfile.verificationStatus === "REJECTED"
                ? "bg-red-50 border-red-200"
                : "bg-amber-50 border-amber-200"
          }`}
        >
          <Icon
            icon={businessProfile.verificationStatus === "APPROVED" ? CheckCircle2 : AlertCircle}
            className={
              businessProfile.verificationStatus === "APPROVED"
                ? "text-emerald-600"
                : businessProfile.verificationStatus === "REJECTED"
                  ? "text-red-600"
                  : "text-amber-600"
            }
          />
          <div>
            <h4
              className={`font-semibold ${
                businessProfile.verificationStatus === "APPROVED"
                  ? "text-emerald-900"
                  : businessProfile.verificationStatus === "REJECTED"
                    ? "text-red-900"
                    : "text-amber-900"
              }`}
            >
              Verification Status: {businessProfile.verificationStatus}
            </h4>
            <p className="text-body-sm mt-1 opacity-80 text-current">
              {businessProfile.verificationStatus === "APPROVED"
                ? "Your business is verified and can post Bulk Marketplace Requests."
                : businessProfile.verificationStatus === "REJECTED"
                  ? "Your verification was rejected. Please update your business details."
                  : "Your business account is currently under review by our admin team."}
            </p>
          </div>
        </div>
      )}

      {extrasError && (
        <ErrorBanner className="mt-6 max-w-form">{extrasError}</ErrorBanner>
      )}

      <Card className="mt-6 p-6 md:p-8 bg-white rounded-2xl shadow-sm border border-neutral-100 transition-all">
        <h3 className="text-xl font-bold text-neutral-900 mb-6">Business Details</h3>
        <div className="flex flex-col gap-6">
          <EditableField
            label="Business name"
            value={businessProfile?.businessName ?? ""}
            placeholder={businessProfile ? "Not set" : "Loading…"}
            onSave={handleSaveBusinessName}
            isSaving={businessNameSave.isSaving}
            errorText={businessNameSave.error}
            disabled={!businessProfile}
          />
          <EditableField
            label="Trade license / registration number"
            value={businessProfile?.tradeLicenseNumber ?? ""}
            placeholder={businessProfile ? "Not set" : "Loading…"}
            onSave={handleSaveTradeLicense}
            isSaving={tradeLicenseSave.isSaving}
            errorText={tradeLicenseSave.error}
            disabled={!businessProfile}
          />
          <div className="flex items-center justify-between border border-neutral-100 p-4 rounded-xl">
            <div className="flex flex-col">
              <span className="text-body font-semibold text-neutral-900">CSR Contributions</span>
              <span className="text-body-sm text-neutral-500">Ask for a CSR contribution after every completed Bulk Marketplace pickup.</span>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5 accent-emerald-600 rounded shrink-0 cursor-pointer"
              checked={businessProfile?.askForCsrContribution ?? false}
              onChange={(e) => void handleToggleCsr(e.target.checked)}
              disabled={!businessProfile}
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8 items-start">
        {/* Left Column: Profile Snapshot */}
        <div className="lg:col-span-1 self-stretch">
          <Card className="h-full p-0 bg-white rounded-2xl shadow-sm border border-neutral-100 transition-all flex flex-col items-center justify-center text-center overflow-hidden">
            <div className="p-6 flex flex-col items-center w-full">
              <AvatarUpload
                name={user.fullName}
                currentSrc={extras?.avatarUrl ?? null}
                accent="user"
                size="lg"
                isUploading={avatarUploadState.isUploading}
                error={avatarUploadState.error}
                onFileSelected={handleAvatarFileSelected}
                className="items-center text-center mb-3"
              />
              <h2 className="text-h3 font-heading text-neutral-900">{user.fullName}</h2>
              <p className="text-body text-neutral-500">{user.email}</p>
              <div className="mt-4 w-full flex flex-col items-center justify-center gap-2">
                <div className="text-caption text-primary-700 bg-primary-50 px-4 py-2 rounded-full font-medium flex items-center gap-2">
                  <Icon icon={User} size="sm" /> {user.accountType === "BUSINESS" ? "Business Account" : "User Account"}
                </div>
                {user.accountType === "BUSINESS" && (
                  <div className="text-caption text-amber-700 bg-amber-50 px-4 py-2 rounded-full font-medium flex items-center gap-2">
                    <Icon icon={Award} size="sm" /> Business Loyalty
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Personal Details */}
        <div className="lg:col-span-2">
          <Card className="p-6 md:p-8 bg-white rounded-2xl shadow-sm border border-neutral-100 transition-all">
            <h3 className="text-xl font-bold text-neutral-900 mb-6">Personal Details</h3>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col">
                <span className="text-label text-neutral-800 mb-1">Account Type</span>
                <div className="text-body text-neutral-900 font-medium">
                  {user.accountType === "BUSINESS" ? "🏢 Business" : "🏠 Household"}
                </div>
              </div>
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
              <div>
                {!isEditingAddress ? (
                  <FieldDisplayRow
                    label="Address"
                    value={extras?.formattedAddress ?? ""}
                    placeholder={extras ? "Not set" : "Loading…"}
                    onEdit={handleEditAddress}
                    editDisabled={!extras}
                    editButtonRef={addressEditButtonRef}
                  />
                ) : (
                  <>
                    <AddressAutocomplete
                      label="Address"
                      name="address"
                      placeholder="Start typing your address…"
                      value={addressQuery}
                      onChange={handleAddressQueryChange}
                      suggestions={addressSuggestions}
                      onSelectSuggestion={(suggestion) => void handleSelectAddressSuggestion(suggestion)}
                      isLoading={isLoadingAddressSuggestions}
                      error={addressSuggestionsError ?? addressSave.error}
                      disabled={addressSave.isSaving}
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <Button variant="ghost" size="sm" disabled={addressSave.isSaving} onClick={handleCancelAddress}>
                        Cancel
                      </Button>
                      {addressSave.isSaving && <span className="text-caption text-neutral-500">Saving…</span>}
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <ChangePasswordSection hasPassword={user.hasPassword} />
        <DeleteAccountSection hasPassword={user.hasPassword} />
      </div>

      <Card className="mt-8 p-6 md:p-8 bg-white rounded-2xl shadow-sm border border-neutral-100 transition-all">
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
            Email me about pickup updates
          </label>
          <label className="flex items-center gap-3 text-body text-neutral-900 cursor-pointer p-3 rounded-xl hover:bg-neutral-50 transition-colors">
            <input
              type="checkbox"
              className="h-5 w-5 accent-primary-600 rounded shrink-0"
              checked={extras?.rewardsEmailNotificationsEnabled ?? false}
              disabled={!extras}
              onChange={(event) => void handleToggleNotification("rewardsEmail", event.target.checked)}
            />
            Email me about rewards &amp; referral updates
          </label>
        </div>

        {!extras && (
          <p className="text-caption text-neutral-500 mt-4">Loading your saved preferences…</p>
        )}
        {notificationError && <ErrorBanner className="mt-4">{notificationError}</ErrorBanner>}
      </Card>
    </PageContainer>
  );
}
