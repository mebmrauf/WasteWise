"use client";

/**
 * NavBar — top navigation bar (marketing header today, reusable as a role-scoped dashboard
 * topbar later). `accent` is a prop, not a per-role component: it tints the active link
 * (desktop + mobile) using that role's color steps. Omit it (or pass "user") for the default
 * brand-green treatment used on public pages.
 *
 * Usage:
 *   <NavBar
 *     brand={<span className="font-heading text-h4 text-neutral-900">WasteWise</span>}
 *     links={[{ label: "How it works", href: "#how-it-works" }]}
 *     actions={<Button href="/signup">Get started</Button>}
 *   />
 *
 * "use client" because it holds local mobile-menu-open state, so Server Component pages (e.g.
 * the landing page, which needs a page-level `metadata` export) can still import and render it.
 */
import * as React from "react";
import { Menu, X } from "lucide-react";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

export type RoleAccent = "user" | "collector" | "recyclingCompany" | "admin";

export interface NavLink {
  label: string;
  href: string;
  active?: boolean;
}

export interface NavBarProps {
  /** Logo/wordmark slot, rendered at the left edge. */
  brand?: React.ReactNode;
  links?: NavLink[];
  /** Right-aligned CTA(s) or account chip. */
  actions?: React.ReactNode;
  /** Role-accent used for the active link. Defaults to "user" (brand green). */
  accent?: RoleAccent;
  className?: string;
}

// "recyclingCompany" maps to the "role-recycler" Tailwind color group name in
// tailwind.config.ts — a naming-only difference, the color values are identical.
const accentActiveTextClasses: Record<RoleAccent, string> = {
  user: "text-role-user-700",
  collector: "text-role-collector-700",
  recyclingCompany: "text-role-recycler-700",
  admin: "text-role-admin-700",
};

const accentUnderlineClasses: Record<RoleAccent, string> = {
  user: "border-role-user-500",
  collector: "border-role-collector-500",
  recyclingCompany: "border-role-recycler-500",
  admin: "border-role-admin-500",
};

const accentHoverTextClasses: Record<RoleAccent, string> = {
  user: "hover:text-role-user-700",
  collector: "hover:text-role-collector-700",
  recyclingCompany: "hover:text-role-recycler-700",
  admin: "hover:text-role-admin-700",
};

export function NavBar({ brand, links = [], actions, accent = "user", className }: NavBarProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const mobileMenuId = React.useId();
  const hasLinks = links.length > 0;

  return (
    <header className={cn("h-16 w-full border-b border-neutral-200 bg-neutral-0", className)}>
      <div className="mx-auto flex h-full w-full max-w-content items-center justify-between px-4 md:px-6 lg:px-8">
        <div className="flex items-center">{brand}</div>

        {hasLinks && (
          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-6">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-current={link.active ? "page" : undefined}
                    className={cn(
                      "text-body-sm text-neutral-600 transition-colors",
                      accentHoverTextClasses[accent],
                      link.active && ["border-b-2 pb-1", accentActiveTextClasses[accent], accentUnderlineClasses[accent]]
                    )}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="hidden items-center gap-3 md:flex">{actions}</div>

        {hasLinks && (
          <button
            type="button"
            className="text-neutral-700 md:hidden"
            aria-expanded={mobileOpen}
            aria-controls={mobileMenuId}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            <Icon icon={mobileOpen ? X : Menu} size="lg" />
          </button>
        )}
      </div>

      {mobileOpen && hasLinks && (
        <nav id={mobileMenuId} aria-label="Primary" className="border-t border-neutral-200 md:hidden">
          <ul className="flex flex-col gap-1 px-4 py-3">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  aria-current={link.active ? "page" : undefined}
                  className={cn(
                    "block rounded-md px-3 py-2 text-body-sm text-neutral-600",
                    link.active && ["bg-neutral-50", accentActiveTextClasses[accent]]
                  )}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          {actions && <div className="border-t border-neutral-200 px-4 py-3">{actions}</div>}
        </nav>
      )}
    </header>
  );
}
