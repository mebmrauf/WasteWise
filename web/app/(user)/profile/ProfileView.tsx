"use client";

// Client Component because it uses useRequireRole and holds local edit/save state, mirroring
// the page.tsx (server) + *View.tsx (client) split used for /login and /signup. Gated to
// USER-role accounts only — Household and Business share `role: "USER"`, distinguished by
// `accountType`, so no extra gate is needed.
//
// `GET /users/me` returns fields (formattedAddress, avatarUrl, notification prefs, ...) that
// AuthContext's AuthUser type doesn't carry, and there's no shared "extended user" type for
// it — so fullName/phone are seeded from useAuth().user immediately (page isn't blank while
// the real fetch is pending) while the rest lives in a separate `extras` state (ProfileExtras
// below), null until GET /users/me resolves. Fields reading from `extras` show a disabled
// "Loading…" state rather than guessing a value.
//
// The address field uses AddressAutocomplete instead of EditableField: PATCH /users/me only
// accepts a Google `placeId` for the address, never free text, so selecting a suggestion *is*
// the save action — there's no separate Save button, only Cancel. The Places Autocomplete
// session-token lifecycle (Google bills per session, not per keystroke) is owned entirely
// here: one token per edit attempt (ensureAddressSessionToken), rotated once a suggestion is
// picked or editing is cancelled (rotateAddressSessionToken). Keystrokes are debounced and
// gated to a minimum length before calling fetchAddressSuggestions, and a monotonically
// increasing request sequence ref discards stale out-of-order responses.
import * as React from "react";
import { AvatarUpload } from "@/components/AvatarUpload";
import { AddressAutocomplete, type AddressSuggestion } from "@/components/AddressAutocomplete";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Divider } from "@/components/Divider";
import { EditableField } from "@/components/EditableField";
import { ErrorBanner } from "@/components/ErrorBanner";
import { FieldDisplayRow } from "@/components/FieldDisplayRow";
import { PageContainer } from "@/components/PageContainer";
import { useRequireRole } from "@/lib/auth/AuthContext";
import { AuthApiError } from "@/lib/api/auth";
import { fetchAddressSuggestions, PlacesConfigError } from "@/lib/api/places";
import {
  getMyProfile,
  updateMyProfile,
  uploadMyAvatar,
  resolveAvatarUrl,
  type UpdateProfileInput,
} from "@/lib/api/users";

// Never surface a raw AuthApiError.message for an unmapped code — fall back to the caller-supplied default.
const profileErrorMessages: Record<string, string> = {
  VALIDATION_ERROR: "Please check that value and try again.",
  PHONE_IN_USE: "That phone number is already linked to another account.",
  UNSUPPORTED_FILE_TYPE: "Please upload a JPEG, PNG, or WEBP image.",
  FILE_TOO_LARGE: "Image must be smaller than 2MB.",
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

/** The `GET /users/me` fields beyond what AuthContext's AuthUser already carries. */
interface ProfileExtras {
  formattedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  avatarUrl: string | null;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
}

interface FieldSaveState {
  isSaving: boolean;
  error: string | null;
}

const idleSaveState: FieldSaveState = { isSaving: false, error: null };

export function ProfileView() {
  const { user, isLoading, refetchUser } = useRequireRole(["USER"]);

  // Tracked as local drafts (rather than reading straight from `user`) so EditableField's
  // optimistic local update on save has somewhere to live, kept in sync via the effect below.
  const [fullName, setFullName] = React.useState(user?.fullName ?? "");
  const [phone, setPhone] = React.useState(user?.phone ?? "");

  React.useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phone ?? "");
    }
  }, [user]);

  const [extras, setExtras] = React.useState<ProfileExtras | null>(null);
  // Distinct from the per-field save errors below — surfaced via ErrorBanner so a failed
  // load doesn't leave every field stuck silently on "Loading…".
  const [extrasError, setExtrasError] = React.useState<string | null>(null);

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
          smsNotificationsEnabled: profile.smsNotificationsEnabled,
        });
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

  const [isEditingAddress, setIsEditingAddress] = React.useState(false);
  const [addressQuery, setAddressQuery] = React.useState("");
  const [addressSuggestions, setAddressSuggestions] = React.useState<AddressSuggestion[]>([]);
  const [isLoadingAddressSuggestions, setIsLoadingAddressSuggestions] = React.useState(false);
  const [addressSuggestionsError, setAddressSuggestionsError] = React.useState<string | null>(null);
  const [addressSave, setAddressSave] = React.useState<FieldSaveState>(idleSaveState);

  const addressSessionTokenRef = React.useRef<string | null>(null);
  const addressDebounceTimerRef = React.useRef<number | null>(null);
  // Guards against a slower earlier suggestions request overwriting a faster later one.
  const addressRequestSeqRef = React.useRef(0);
  // When address edit mode closes (save or cancel), move focus back to the reappeared "Edit"
  // button rather than leaving keyboard/screen-reader focus stranded nowhere.
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
      if (seq !== addressRequestSeqRef.current) return; // a newer request superseded this one
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
      // Invalidate any in-flight request too, so a slow response for a longer,
      // since-deleted query can't reappear.
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
    addressRequestSeqRef.current += 1; // invalidate any in-flight suggestions fetch
    rotateAddressSessionToken();
    setAddressSuggestions([]);
    setIsLoadingAddressSuggestions(false);
    setAddressSuggestionsError(null);
    setAddressSave(idleSaveState);
    setIsEditingAddress(false);
  }

  async function handleSelectAddressSuggestion(suggestion: AddressSuggestion) {
    clearPendingAddressDebounce();
    addressRequestSeqRef.current += 1; // invalidate any in-flight suggestions fetch
    // The Autocomplete "session" ends the moment a suggestion is chosen,
    // regardless of whether the follow-up PATCH below succeeds — rotate now.
    rotateAddressSessionToken();
    setAddressQuery(suggestion.description);
    setAddressSuggestions([]);
    setIsLoadingAddressSuggestions(false);
    setAddressSuggestionsError(null);
    setAddressSave({ isSaving: true, error: null });
    try {
      const { user: updated } = await updateMyProfile({ placeId: suggestion.placeId });
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
      // Stay in editing mode on failure so the user can pick another suggestion or retry.
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
      // Keep AuthContext/NavBar's "Hi, {name}" greeting in sync — fire and forget.
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

  async function handleToggleNotification(kind: "email" | "sms", checked: boolean) {
    if (!extras) return;
    const previous = extras;
    const key = kind === "email" ? "emailNotificationsEnabled" : "smsNotificationsEnabled";
    setNotificationError(null);
    setExtras({ ...extras, [key]: checked });
    try {
      const payload: UpdateProfileInput =
        key === "emailNotificationsEnabled"
          ? { emailNotificationsEnabled: checked }
          : { smsNotificationsEnabled: checked };
      await updateMyProfile(payload);
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
    // useRequireRole is already redirecting — render nothing rather than flash gated content.
    return null;
  }

  return (
    <PageContainer className="py-8 lg:py-12">
      <h1 className="text-h1 text-neutral-900">Your profile</h1>
      <p className="mt-2 text-body-lg text-neutral-500">
        Manage your contact details, address, avatar, and notification preferences.
      </p>

      {extrasError && (
        <ErrorBanner className="mt-4 max-w-form">{extrasError}</ErrorBanner>
      )}

      <Card className="mt-8 max-w-form">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <AvatarUpload
            name={user.fullName}
            currentSrc={extras?.avatarUrl ?? null}
            accent="user"
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

        <Divider label="Notification preferences" className="my-6" />

        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-body-sm text-neutral-900">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary-600"
              checked={extras?.emailNotificationsEnabled ?? false}
              disabled={!extras}
              onChange={(event) => void handleToggleNotification("email", event.target.checked)}
            />
            Email me about pickup updates
          </label>
          <label className="flex items-center gap-2 text-body-sm text-neutral-900">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary-600"
              checked={extras?.smsNotificationsEnabled ?? false}
              disabled={!extras}
              onChange={(event) => void handleToggleNotification("sms", event.target.checked)}
            />
            Text me about pickup updates
          </label>

          {!extras && (
            <p className="text-caption text-neutral-500">Loading your saved preferences…</p>
          )}
          {notificationError && <ErrorBanner>{notificationError}</ErrorBanner>}
        </div>
      </Card>
    </PageContainer>
  );
}
