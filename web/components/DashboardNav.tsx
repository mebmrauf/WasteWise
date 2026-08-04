"use client";

/**
 * DashboardNav — role-scoped app-shell navigation for dashboard layouts. Collector/Recycling
 * Company/Admin dashboards reuse this exact component with a different `accent`/`roleLabel`/
 * `items`.
 *
 * Usage:
 *   <DashboardNav
 *     accent="user"
 *     roleLabel="USER PORTAL"
 *     items={[{ label: "Profile", href: "/profile", icon: User }, ...]}
 *   />
 *
 * One component rather than three, since it's a single navigational concept reflowing across
 * breakpoints: a fixed left sidebar on desktop (`lg`+), an icon-only rail on tablet (`md`–`lg`,
 * with hover/focus tooltips), and a fixed bottom tab bar on mobile. All three mount
 * simultaneously and switch via responsive `hidden`/`flex` utilities, avoiding a hydration
 * flash or resize listener — each gets a distinct `aria-label` so only one is ever in the
 * a11y tree.
 *
 * The mobile tab bar renders at most 5 items (`items.slice(0, 5)`) — no overflow drawer for a
 * 6th item yet; flag for follow-up if a 6-item role nav shows up.
 *
 * The sidebar/rail render only `roleLabel`, not a `brand` slot — that space belongs to the
 * wrapping `NavBar`, which already renders the brand link above this component. `brand` stays
 * in `DashboardNavProps` unused so a future standalone usage isn't a breaking API change later.
 *
 * The dark sidebar/rail focus ring is built from `ring-neutral-0` + `ring-offset-role-
 * {accent}-900` rather than a role-tinted `shadow-focus`, since no role-scoped focus-shadow
 * token exists yet in tokens.ts — flagged as a real design-token gap.
 */
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Icon } from "@/components/Icon";
import type { RoleAccent } from "@/components/NavBar";
import { cn } from "@/lib/utils";

export interface DashboardNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Explicit active-state override. Omit to derive it from the current
   * pathname via `usePathname()`. */
  active?: boolean;
}

export interface DashboardNavProps {
  items: DashboardNavItem[];
  /** Role-accent — same prop pattern as NavBar/Avatar (docs/design-system.md §1.4). */
  accent: RoleAccent;
  /** Eyebrow label at the top of the desktop sidebar, e.g. "USER PORTAL". */
  roleLabel: string;
  /** Logo/wordmark slot. Not rendered here — the wrapping `NavBar` already renders the brand
   * link above this component. Kept as an optional prop so a future standalone usage (without
   * a wrapping `NavBar`) isn't a breaking API change. */
  brand?: React.ReactNode;
  className?: string;
}

const sidebarFillClasses: Record<RoleAccent, string> = {
  user: "bg-role-user-900",
  collector: "bg-role-collector-900",
  recyclingCompany: "bg-role-recycler-900",
  admin: "bg-role-admin-900",
};

const activePillFillClasses: Record<RoleAccent, string> = {
  user: "bg-role-user-500",
  collector: "bg-role-collector-500",
  recyclingCompany: "bg-role-recycler-500",
  admin: "bg-role-admin-500",
};

const ringOffsetClasses: Record<RoleAccent, string> = {
  user: "focus-visible:ring-offset-role-user-900",
  collector: "focus-visible:ring-offset-role-collector-900",
  recyclingCompany: "focus-visible:ring-offset-role-recycler-900",
  admin: "focus-visible:ring-offset-role-admin-900",
};

const mobileActiveTextClasses: Record<RoleAccent, string> = {
  user: "text-role-user-500",
  collector: "text-role-collector-500",
  recyclingCompany: "text-role-recycler-500",
  admin: "text-role-admin-500",
};

/** Sidebar/rail focus ring — see the "Focus ring" note in the file header. */
const darkSurfaceFocusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-0 focus-visible:ring-offset-2";

/** Mobile tab-bar focus ring — light surface, so the existing generic `shadow-focus` token applies directly. */
const lightSurfaceFocusRing = "focus-visible:outline-none focus-visible:shadow-focus";

/**
 * Resolves an active/inactive boolean per item. `item.active` is a per-item override that
 * skips path matching entirely when present.
 *
 * The rest can't just check "does `pathname` start with `item.href`" independently per item —
 * that false-positives whenever one item's `href` is a string-prefix of a sibling's (e.g.
 * "My Pickups" → /pickups and "Track Pickup" → /pickups/track are siblings, yet
 * /pickups/track/123 nests under both). So an exact match wins outright; otherwise only the
 * most specific (longest `href`) nested match is marked active.
 */
function resolveActiveStates(items: DashboardNavItem[], pathname: string | null): boolean[] {
  const result = items.map((item) => item.active);
  const candidates = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.active === undefined);

  if (pathname && candidates.length > 0) {
    const exact = candidates.find(({ item }) => item.href === pathname);
    if (exact) {
      result[exact.index] = true;
    } else {
      let best: { index: number; length: number } | null = null;
      for (const { item, index } of candidates) {
        if (item.href === "/") continue; // root only ever matches exactly, handled above
        const matches = pathname === item.href || pathname.startsWith(`${item.href}/`);
        if (matches && (!best || item.href.length > best.length)) {
          best = { index, length: item.href.length };
        }
      }
      if (best) result[best.index] = true;
    }
  }

  return result.map((value) => value ?? false);
}

export function DashboardNav({ items, accent, roleLabel, brand, className }: DashboardNavProps) {
  const pathname = usePathname();
  const activeStates = React.useMemo(() => resolveActiveStates(items, pathname), [items, pathname]);
  const mobileItems = items.slice(0, 5);

  return (
    <>
      {/* Desktop — fixed full sidebar (lg+, §6.4) */}
      <nav
        aria-label="Primary"
        className={cn(
          "fixed top-16 bottom-0 left-0 hidden w-sidebar shrink-0 flex-col lg:flex",
          sidebarFillClasses[accent],
          className
        )}
      >
        <div className="flex flex-col gap-1 px-4 pb-4 pt-6">
          <span className="text-overline text-neutral-0/70">{roleLabel}</span>
        </div>
        <ul className="flex flex-col gap-1 px-4">
          {items.map((item, index) => {
            const isActive = activeStates[index];
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-4 rounded-md px-4 py-3 text-body-sm font-medium transition-colors",
                    darkSurfaceFocusRing,
                    ringOffsetClasses[accent],
                    isActive
                      ? cn(activePillFillClasses[accent], "text-neutral-0")
                      : "text-neutral-0/80 hover:text-neutral-0"
                  )}
                >
                  <Icon icon={item.icon} size="md" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Tablet — icon-only collapsed rail (md to just under lg, §6.4) */}
      <nav
        aria-label="Primary (compact)"
        className={cn(
          "fixed top-16 bottom-0 left-0 hidden w-rail shrink-0 flex-col items-center lg:hidden md:flex",
          sidebarFillClasses[accent]
        )}
      >
        <ul className="flex flex-col items-center gap-1 pt-6">
          {items.map((item, index) => {
            const isActive = activeStates[index];
            return (
              <li key={item.href} className="group relative">
                <Link
                  href={item.href}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-md transition-colors",
                    darkSurfaceFocusRing,
                    ringOffsetClasses[accent],
                    isActive
                      ? cn(activePillFillClasses[accent], "text-neutral-0")
                      : "text-neutral-0/80 hover:text-neutral-0"
                  )}
                >
                  <Icon icon={item.icon} size="md" />
                </Link>
                {/* aria-hidden: the Link's own aria-label already conveys the accessible name —
                    otherwise some screen readers would announce this as a redundant second item. */}
                <span
                  role="tooltip"
                  aria-hidden="true"
                  className="pointer-events-none absolute left-full top-1/2 z-10 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-neutral-800 px-3 py-1 text-caption text-neutral-0 opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                >
                  {item.label}
                </span>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobile — bottom tab bar (below md, §6.4) */}
      <nav
        aria-label="Primary (mobile)"
        className="fixed inset-x-0 bottom-0 z-10 flex h-16 items-stretch border-t border-neutral-200 bg-neutral-0 md:hidden"
      >
        <ul className="flex w-full items-stretch">
          {mobileItems.map((item, index) => {
            const isActive = activeStates[index];
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex h-full flex-col items-center justify-center gap-1 text-caption transition-colors",
                    lightSurfaceFocusRing,
                    isActive ? mobileActiveTextClasses[accent] : "text-neutral-500"
                  )}
                >
                  <Icon icon={item.icon} size="md" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
