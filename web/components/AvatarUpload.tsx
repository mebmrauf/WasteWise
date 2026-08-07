"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, type AvatarSize } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import type { RoleAccent } from "@/components/NavBar";

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export interface AvatarUploadProps {
  name: string;
  currentSrc?: string | null;
  accent?: RoleAccent;
  size?: AvatarSize;
  isUploading?: boolean;
  error?: string | null;
  onFileSelected: (file: File) => void;
  triggerLabel?: string;
  className?: string;
}

function validateFile(file: File): string | null {
  if (!ACCEPTED_MIME_TYPES.includes(file.type as (typeof ACCEPTED_MIME_TYPES)[number])) {
    return "Please upload a JPEG, PNG, or WEBP image.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "Image must be smaller than 10MB.";
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

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
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

      <p className="text-caption text-neutral-500">JPEG, PNG, or WEBP. Max 10MB.</p>

      {displayError && <ErrorBanner>{displayError}</ErrorBanner>}
    </div>
  );
}
