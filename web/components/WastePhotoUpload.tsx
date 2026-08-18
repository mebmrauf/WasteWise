"use client";

import * as React from "react";
import { Camera, Loader2, X } from "lucide-react";
import { uploadWastePhotos } from "@/lib/api/wastePhotos";
import { publicEnv } from "@/lib/env";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 4;
const UPLOAD_BASE_URL = publicEnv.NEXT_PUBLIC_API_URL.replace("/api/v1", "");

interface WastePhotoUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export function WastePhotoUpload({ value, onChange, disabled, className }: WastePhotoUploadProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_PHOTOS - value.length;
    if (remaining <= 0) {
      setError(`You can attach at most ${MAX_PHOTOS} photos.`);
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      const { urls } = await uploadWastePhotos(Array.from(files).slice(0, remaining));
      onChange([...value, ...urls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload that photo. Try again.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleRemove(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => void handleFilesSelected(e.target.files)}
        disabled={disabled || isUploading || value.length >= MAX_PHOTOS}
      />

      {value.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3">
          {value.map((url) => (
            <div key={url} className="relative h-20 w-20 shrink-0">
              <img
                src={`${UPLOAD_BASE_URL}${url}`}
                alt="Uploaded waste photo"
                className="h-20 w-20 rounded-lg object-cover border border-neutral-200"
              />
              <button
                type="button"
                onClick={() => handleRemove(url)}
                disabled={disabled}
                aria-label="Remove photo"
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-white shadow-sm hover:bg-neutral-700"
              >
                <Icon icon={X} size="sm" />
              </button>
            </div>
          ))}
        </div>
      )}

      {value.length < MAX_PHOTOS && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || isUploading}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 p-8 text-center transition-colors",
            "hover:bg-neutral-50 hover:border-primary-300 disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          {isUploading ? (
            <Icon icon={Loader2} className="animate-spin text-neutral-400" size="lg" />
          ) : (
            <Icon icon={Camera} className="text-neutral-400" size="lg" />
          )}
          <p className="text-body font-medium text-neutral-700">
            {isUploading ? "Uploading…" : "Upload photos of the waste"}
          </p>
          <p className="text-caption text-neutral-400">
            JPEG, PNG, or WebP · up to {MAX_PHOTOS} photos
          </p>
        </button>
      )}

      {error && <p className="mt-2 text-body-sm text-red-600">{error}</p>}
    </div>
  );
}
