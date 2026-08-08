"use client";

import * as React from "react";
import { Menu, X } from "lucide-react";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

export type RoleAccent = "user" | "collector" | "recyclingCompany" | "admin";

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
    <header className={cn("sticky top-0 z-50 h-16 w-full border-b border-neutral-200 bg-neutral-0/80 backdrop-blur-md", className)}>
      <div className="flex h-full w-full items-center justify-between px-4 md:px-8 lg:px-12">
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
        </nav>
      )}
    </header>
  );
}
