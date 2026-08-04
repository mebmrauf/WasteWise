/**
 * DashboardFeatureTile — shared structural primitive for a dashboard "feature summary" tile:
 * icon → heading → description, optionally a bottom badge, optionally a real navigation
 * target. Factors out the structure ComingSoonCard's placeholder tiles and DashboardHome's
 * "Profile" link tile would otherwise duplicate. Callers own the content — colors, badge,
 * destination — via props; this component hardcodes neither variant's color treatment.
 *
 * Usage:
 *   <DashboardFeatureTile
 *     icon={User}
 *     label="Profile"
 *     description="View and update your contact details, address, and notification preferences."
 *     href="/profile"
 *     iconClassName="text-primary-600"
 *     labelClassName="text-neutral-900"
 *     descriptionClassName="text-neutral-500"
 *   />
 *
 * `href` wraps the tile in a Next `Link` and turns on Card's `interactive` hover treatment
 * unless `interactive` is set explicitly.
 */
import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/Card";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

export interface DashboardFeatureTileProps {
  icon: LucideIcon;
  label: string;
  description: string;
  /** Navigates here when provided (wraps the tile in a Next `Link`). Omit for a static tile. */
  href?: string;
  /** Overrides `Card`'s hover treatment. Defaults to `Boolean(href)`. */
  interactive?: boolean;
  /** Optional trailing badge/status pill, rendered below the description. */
  badge?: React.ReactNode;
  iconClassName?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  /** Forwarded to the underlying `Card`. */
  className?: string;
}

export function DashboardFeatureTile({
  icon,
  label,
  description,
  href,
  interactive,
  badge,
  iconClassName,
  labelClassName,
  descriptionClassName,
  className,
}: DashboardFeatureTileProps) {
  const isInteractive = interactive ?? Boolean(href);

  const content = (
    <Card interactive={isInteractive} className={cn("flex flex-col items-start gap-3", className)}>
      <Icon icon={icon} size="lg" className={iconClassName} />
      <div className="flex flex-col gap-1">
        {/* h2, not h3: every consumer places this directly under a page <h1> with no
            intervening heading level, even though it stays visually sized at text-h4. */}
        <h2 className={cn("text-h4", labelClassName)}>{label}</h2>
        <p className={cn("text-body-sm", descriptionClassName)}>{description}</p>
      </div>
      {badge}
    </Card>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block focus-visible:outline-none focus-visible:shadow-focus"
      >
        {content}
      </Link>
    );
  }

  return content;
}
