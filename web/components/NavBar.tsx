"use client";

import * as React from "react";
import { Menu, X } from "lucide-react";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

export type RoleAccent = "user" | "business" | "collector" | "recyclingCompany" | "admin";

interface NavLink {
  label: string;
  href: string;
  active?: boolean;
}

export interface NavBarProps {
  brand?: React.ReactNode;
  links?: NavLink[];
  actions?: React.ReactNode;
  accent?: RoleAccent;
  className?: string;
}

const accentActiveTextClasses: Record<RoleAccent, string> = {
  user: "text-primary-700",
  business: "text-primary-700",
  collector: "text-collector-700",
  recyclingCompany: "text-recycling-700",
  admin: "text-admin-700",
};

const accentUnderlineClasses: Record<RoleAccent, string> = {
  user: "bg-primary-500",
  business: "bg-primary-500",
  collector: "bg-collector-500",
  recyclingCompany: "bg-recycling-500",
  admin: "bg-admin-500",
};

const accentHoverTextClasses: Record<RoleAccent, string> = {
  user: "hover:text-primary-600",
  business: "hover:text-primary-600",
  collector: "hover:text-collector-600",
  recyclingCompany: "hover:text-recycling-600",
  admin: "hover:text-admin-600",
};

export function NavBar({ brand, links = [], actions, accent = "user", className }: NavBarProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const mobileMenuId = React.useId();
  const hasLinks = links.length > 0;

  return (
    <header className={cn("sticky top-0 z-50 w-full border-b border-neutral-200 bg-neutral-0/80 backdrop-blur-md", className)}>
      <div className="flex h-16 w-full items-center justify-between px-4 md:px-8 lg:px-12">
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

        <div className="flex items-center gap-2 sm:gap-3">
          {actions}

          {hasLinks && (
            <button
              type="button"
              className="text-neutral-700 md:hidden ml-2"
              aria-expanded={mobileOpen}
              aria-controls={mobileMenuId}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileOpen((open) => !open)}
            >
              <Icon icon={mobileOpen ? X : Menu} size="lg" />
            </button>
          )}
        </div>
      </div>

      {mobileOpen && hasLinks && (
        <nav id={mobileMenuId} aria-label="Primary" className="border-t border-neutral-200 bg-neutral-0 md:hidden absolute w-full left-0 top-16 shadow-lg">
          <ul className="flex flex-col gap-1 px-4 py-3">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  aria-current={link.active ? "page" : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "block rounded-md px-3 py-2 text-body-sm text-neutral-600 transition-colors",
                    accentHoverTextClasses[accent],
                    link.active && ["bg-neutral-50", accentActiveTextClasses[accent]]
                  )}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
