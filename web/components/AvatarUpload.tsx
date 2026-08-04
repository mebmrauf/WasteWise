"use client";

/**
 * AvatarUpload — interactive avatar-change control for a profile page. Wraps `Avatar` with a
 * hidden file input + trigger `Button`, and shows a local preview (via `URL.createObjectURL`)
 * before any upload has actually happened.
 *
 * Client-side validates file type/size against the same limits `POST /users/me/avatar`
 * enforces server-side (image/jpeg, image/png, image/webp, max 2MB) for immediate feedback —
 * this is not a substitute for server-side validation.
 *
 * Does not perform the upload request itself: `onFileSelected(file)` fires once a file passes
 * client-side validation, and the parent owns calling the API, updating `currentSrc`
 * afterwards, and setting the `isUploading`/`error` controlled props while its request is in
 * flight or has failed.
 *
 * Usage:
 *   <AvatarUpload
 *     name={user.fullName}
 *     currentSrc={user.avatarUrl}
 *     isUploading={isUploading}
 *     error={error}
 *     onFileSelected={handleAvatarFileSelected}
 *   />
 */
import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, type AvatarSize } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import type { RoleAccent } from "@/components/NavBar";

// Must match POST /users/me/avatar's server-side validation exactly (api-contract.md §3).
const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export interface AvatarUploadProps {
  /** Full name — passed through to Avatar for initials fallback + alt text. */
  name: string;
  /** The currently-persisted avatar URL (or null), as returned by GET /users/me. */
  currentSrc?: string | null;
  accent?: RoleAccent;
  size?: AvatarSize;
  /** True while the parent's upload request for a previously-selected file is in flight. */
  isUploading?: boolean;
  /** Server-side (or otherwise parent-supplied) error message, e.g. a failed upload. */
  error?: string | null;
  /** Fires once a file passes client-side type/size validation. */
  onFileSelected: (file: File) => void;
  /** Defaults to "Change photo" (or "Upload photo" if there's no current image). */
  triggerLabel?: string;
  className?: string;
}

function validateFile(file: File): string | null {
  if (!ACCEPTED_MIME_TYPES.includes(file.type as (typeof ACCEPTED_MIME_TYPES)[number])) {
    return "Please upload a JPEG, PNG, or WEBP image.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "Image must be smaller than 2MB.";
  }
  return null;
}

export function AvatarUpload({
  name,
  currentSrc,
  accent = "user",
  size = "lg",
  isUploading = false,
  error = null,
  onFileSelected,
  triggerLabel,
  className,
}: AvatarUploadProps) {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const inputId = React.useId();

  // Revoke the object URL on change/unmount so blob URLs don't leak across repeated selections.
  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Browsers dedupe identical values, so reset the input to let re-selecting the same file
    // fire another change event.
    event.target.value = "";
    if (!file) return;

    const validationMessage = validateFile(file);
    if (validationMessage) {
      setValidationError(validationMessage);
      return;
    }

    setValidationError(null);
    setPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
    onFileSelected(file);
  }

  const displayImage = previewUrl ?? currentSrc ?? null;
  const displayError = validationError ?? error;
  const hasImage = Boolean(displayImage);

  return (
    <div className={cn("flex flex-col items-start gap-3", className)}>
      <div className="relative">
        <Avatar src={displayImage} name={name} size={size} accent={accent} />
        {isUploading && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-full bg-neutral-900/60"
            aria-hidden="true"
          >
            <span className="text-caption text-neutral-0">Uploading…</span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED_MIME_TYPES.join(",")}
        onChange={handleFileChange}
        disabled={isUploading}
        aria-label={triggerLabel ?? `${hasImage ? "Change" : "Upload"} profile photo`}
        className="sr-only"
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading ? "Uploading…" : (triggerLabel ?? (hasImage ? "Change photo" : "Upload photo"))}
      </Button>

      <p className="text-caption text-neutral-500">JPEG, PNG, or WEBP. Max 2MB.</p>

      {displayError && <ErrorBanner>{displayError}</ErrorBanner>}
    </div>
  );
}
