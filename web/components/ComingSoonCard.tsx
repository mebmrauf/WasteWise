/**
 * ComingSoonCard — placeholder for a dashboard feature that isn't built yet. Composes
 * `DashboardFeatureTile` for structure and only supplies the muted "not built yet" content
 * treatment (colors + badge). Renders as a plain, non-interactive container (no `href`/
 * `onClick`) rather than a disabled button — there's no destination or action to represent,
 * and `aria-disabled` implies a control that would do something once enabled.
 *
 * Usage:
 *   <ComingSoonCard
 *     icon={Award}
 *     label="Loyalty rewards"
 *     description="Earn points for consistent recycling and redeem them for perks."
 *   />
 *
 * `label`/`description` use `neutral-600`/`neutral-500` rather than Button.tsx's disabled-
 * label `neutral-400`: that lighter shade is WCAG-exempt only for text belonging to an actual
 * disabled widget, and this is ordinary informational content, so it needs to clear the
 * normal contrast floor. Only the icon, purely decorative here, uses `neutral-400`.
 */
import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { DashboardFeatureTile } from "@/components/DashboardFeatureTile";
import { cn } from "@/lib/utils";

export interface ComingSoonCardProps {
  icon: LucideIcon;
  label: string;
  description: string;
  /** Small status pill text. Defaults to "Coming soon"; pass e.g. "In progress" for
   * features that are actively being built rather than merely planned. */
  badgeLabel?: string;
  className?: string;
}

export function ComingSoonCard({ icon, label, description, badgeLabel = "Coming soon", className }: ComingSoonCardProps) {
  return (
    <DashboardFeatureTile
      icon={icon}
      label={label}
      description={description}
      iconClassName="text-neutral-400"
      labelClassName="text-neutral-600"
      descriptionClassName="text-neutral-500"
      className={cn("bg-neutral-50", className)}
      badge={
        <span className="rounded-full border border-neutral-300 px-3 py-1 text-label text-neutral-800">
          {badgeLabel}
        </span>
      }
    />
  );
}
