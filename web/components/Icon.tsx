import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { iconSize, iconStrokeWidth } from "@/lib/tokens";
import { cn } from "@/lib/utils";

type IconSize = keyof typeof iconSize;

export interface IconProps {
  icon: LucideIcon;
  size?: IconSize;
  className?: string;
  "aria-hidden"?: boolean;
  "aria-label"?: string;
}

export function Icon({
  icon: LucideIconComponent,
  size = "md",
  className,
  "aria-hidden": ariaHidden,
  "aria-label": ariaLabel,
}: IconProps) {
  const hidden = ariaHidden ?? !ariaLabel;

  return (
    <LucideIconComponent
      size={iconSize[size]}
      strokeWidth={iconStrokeWidth}
      className={cn("shrink-0", className)}
      aria-hidden={hidden || undefined}
      aria-label={ariaLabel}
      role={!hidden && ariaLabel ? "img" : undefined}
    />
  );
}
