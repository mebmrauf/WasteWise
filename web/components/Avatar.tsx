"use client";

/**
 * Avatar — circular avatar with initials fallback. Purely presentational: takes an image
 * `src` (nullable) and falls back to initials on a role-accent circle whenever `src` is
 * absent or fails to load. Does not handle the upload interaction — see AvatarUpload.tsx.
 *
 * Usage:
 *   <Avatar name="Rafiq Hasan" src={user.avatarUrl} />
 *   <Avatar name="Jane Doe" size="lg" accent="collector" />
 *
 * `size` only changes the circle's diameter (design-system.md §6.2) — initials stay the same
 * weight/size across all three, rather than a larger type step for `lg`.
 */
import * as React from "react";
import { cn } from "@/lib/utils";
import type { RoleAccent } from "@/components/NavBar";

export type AvatarSize = "sm" | "md" | "lg";

export interface AvatarProps {
  /** Image URL. Pass `null`/`undefined`/`""` to always show the initials fallback. */
  src?: string | null;
  /** Full name — used to derive initials and as the image `alt` text. */
  name: string;
  size?: AvatarSize;
  /** Role-accent used for the initials-fallback background. Defaults to "user". */
  accent?: RoleAccent;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-20 w-20",
};

const accentFillClasses: Record<RoleAccent, string> = {
  user: "bg-role-user-500",
  collector: "bg-role-collector-500",
  recyclingCompany: "bg-role-recycler-500",
  admin: "bg-role-admin-500",
};

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";

  const parts = trimmed.split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  const initials = (first + last).toUpperCase();
  return initials || "?";
}

export function Avatar({ src, name, size = "md", accent = "user", className }: AvatarProps) {
  // Drops back to the initials fallback on a broken/expired image URL instead of showing a
  // broken-image icon. Reset whenever `src` changes so a new URL gets a fresh attempt.
  const [imageFailed, setImageFailed] = React.useState(false);
  React.useEffect(() => {
    setImageFailed(false);
  }, [src]);

  const showImage = Boolean(src) && !imageFailed;

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external/user-uploaded URL, not a static local asset next/image can optimize
      <img
        src={src as string}
        alt={name}
        onError={() => setImageFailed(true)}
        className={cn("rounded-full object-cover", sizeClasses[size], className)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={name}
      className={cn(
        "flex items-center justify-center rounded-full text-label font-semibold text-neutral-0",
        sizeClasses[size],
        accentFillClasses[accent],
        className
      )}
    >
      <span aria-hidden="true">{getInitials(name)}</span>
    </div>
  );
}
