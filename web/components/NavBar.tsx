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
  /** Dashboard shells already offset content for their sidebar — the header row should span the full width instead of being centered at the marketing max-width. */
  fullWidth?: boolean;
}

const accentActiveTextClasses: Record<RoleAccent, string> = {
  user: "text-role-user-700",
  business: "text-role-business-700",
  collector: "text-role-collector-700",
  recyclingCompany: "text-role-recycler-700",
  admin: "text-role-admin-700",
};

const accentUnderlineClasses: Record<RoleAccent, string> = {
  user: "border-role-user-500",
  business: "border-role-business-500",
  collector: "border-role-collector-500",
  recyclingCompany: "border-role-recycler-500",
  admin: "border-role-admin-500",
};

const accentHoverTextClasses: Record<RoleAccent, string> = {
  user: "hover:text-role-user-700",
  business: "hover:text-role-business-700",
  collector: "hover:text-role-collector-700",
  recyclingCompany: "hover:text-role-recycler-700",
  admin: "hover:text-role-admin-700",
};

export function NavBar({ brand, links = [], actions, accent = "user", className, fullWidth = false }: NavBarProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const mobileMenuId = React.useId();
  const hasLinks = links.length > 0;
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
<<<<<<< Updated upstream
    <header className={cn("sticky top-0 z-50 w-full border-b border-neutral-200 bg-neutral-0/80 backdrop-blur-md", className)}>
      <div className="flex h-16 w-full items-center justify-between px-4 md:px-8 lg:px-12">
=======
    <header className={cn(
      "sticky top-0 z-50 w-full transition-all duration-300",
      scrolled ? "bg-white/95 backdrop-blur-md shadow-sm py-0" : "bg-white/80 backdrop-blur-md py-2",
      className
    )}>
      <div className={cn(
        "flex h-[72px] w-full items-center justify-between px-6 md:px-12 lg:px-16",
        fullWidth ? "max-w-none" : "mx-auto max-w-content",
      )}>
>>>>>>> Stashed changes
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
                      "text-[16px] text-neutral-600 transition-all duration-300 relative group py-1",
                      accentHoverTextClasses[accent],
                      link.active && [accentActiveTextClasses[accent]]
                    )}
                  >
                    {link.label}
<<<<<<< Updated upstream
=======
                    <span className={cn(
                      "absolute bottom-0 left-0 w-full h-1 bg-current transform origin-left transition-transform duration-300",
                      link.active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                      accentUnderlineClasses[accent]
                    )} />
>>>>>>> Stashed changes
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
