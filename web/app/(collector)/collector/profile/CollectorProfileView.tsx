"use client";

import * as React from "react";
import { AvatarUpload } from "@/components/AvatarUpload";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Divider } from "@/components/Divider";
import { EditableField } from "@/components/EditableField";
import { ErrorBanner } from "@/components/ErrorBanner";
import { FieldDisplayRow } from "@/components/FieldDisplayRow";
import { Input } from "@/components/Input";
import { PageContainer } from "@/components/PageContainer";
import { Select } from "@/components/Select";
import { StatusPill } from "@/components/StatusPill";

import { useRequireRole } from "@/lib/auth/AuthContext";
import { AuthApiError } from "@/lib/api/auth";
import {
  getMyProfile,
  updateMyProfile,
  updateCollectorProfile,
  uploadMyAvatar,
  resolveAvatarUrl,
  type CollectorProfileSummary,
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
}

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
        });
        setDetails(draftFromProfile(profile.collectorProfile));
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
  const [avatarUploadState, setAvatarUploadState] = React.useState<{
    isUploading: boolean;
    error: string | null;
  }>({ isUploading: false, error: null });

  const [detailsSave, setDetailsSave] = React.useState<FieldSaveState>(idleSaveState);
  const savedDetails = draftFromProfile(extras?.collectorProfile ?? null);
  const detailsChanged =
    details.vehicleType !== savedDetails.vehicleType ||
    details.vehicleNumber !== savedDetails.vehicleNumber ||
    details.licenseNumber !== savedDetails.licenseNumber ||
    details.serviceArea !== savedDetails.serviceArea;

  const hasRequiredDetails =
    details.vehicleNumber.trim().length > 0 &&
    details.licenseNumber.trim().length > 0 &&
    details.serviceArea.trim().length > 0;

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
      });
      setExtras((prev) => (prev ? { ...prev, collectorProfile: updated } : prev));
      setDetails(draftFromProfile(updated));
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
            <Select
              label="Service area"
              value={details.serviceArea}
              disabled={!extras || detailsSave.isSaving}
              onChange={(event) =>
                setDetails((prev) => ({ ...prev, serviceArea: event.target.value }))
              }
              options={[
                { value: "", label: "Select an area..." },
                ...ALL_SERVICE_AREAS.map((area: string) => ({ value: area, label: area }))
              ]}
            />
            <p className="mt-1 text-label text-neutral-500">
              The area you collect from — shown to help match you with nearby pickup requests.
            </p>
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
      </div>
    </PageContainer>
  );
}
