"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { RoleAccent } from "@/components/NavBar";

export type AvatarSize = "sm" | "md" | "lg" | "xl" | "2xl";

export interface AvatarProps {
  src?: string | null;
  name: string;
  size?: AvatarSize;
  accent?: RoleAccent;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-caption",
  md: "h-10 w-10 text-body-sm",
  lg: "h-20 w-20 text-h4",
  xl: "h-[150px] w-[150px] text-h3",
  "2xl": "h-40 w-40 text-display",
};

const accentFillClasses: Record<RoleAccent, string> = {
  user: "bg-role-user-500",
  business: "bg-role-business-500",
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
        referrerPolicy="no-referrer"
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
