/**
 * Icon — shared wrapper around Lucide icon components, so stroke width and sizing stay
 * centrally controlled rather than set per-instance.
 *
 * Usage:
 *   <Icon icon={Home} />                                          // 20px default
 *   <Icon icon={Home} size="lg" />                                // 24px, page headers
 *   <Icon icon={Home} size="sm" className="text-neutral-500" />   // 16px inline, muted
 *
 * No `color`/`stroke` prop — icons inherit `currentColor`, so set color via a `text-*`
 * className on the icon or an ancestor.
 */
import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { iconSize, iconStrokeWidth } from "@/lib/tokens";
import { cn } from "@/lib/utils";

export type IconSize = keyof typeof iconSize;

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
  // Decorative by default; an aria-label means it's a meaningful standalone icon. SVG has no
  // implicit "img" role, so set one explicitly whenever the icon should be announced.
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
