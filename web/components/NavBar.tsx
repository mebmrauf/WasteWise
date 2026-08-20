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
  /**
   * Dashboard shells render a fixed-width sidebar/rail pinned to the true left edge, so
   * centering this header within `max-w-content` leaves a large empty gap between the
   * actions and the real right edge on wide viewports. Set true to render edge-to-edge instead.
   */
  edgeToEdge?: boolean;
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

export function NavBar({ brand, links = [], actions, accent = "user", className, edgeToEdge = false }: NavBarProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const mobileMenuId = React.useId();
  const hasLinks = links.length > 0;
  const [scrolled, setScrolled] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState<string>("");

  React.useEffect(() => {
    // Hysteresis (enter at 24px, exit at 8px) so a 1-2px scroll-anchoring
    // correction near a single threshold can't flip this back and forth.
    const handleScroll = () => {
      setScrolled((prev) => {
        if (prev) return window.scrollY > 8;
        return window.scrollY > 24;
      });
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  React.useEffect(() => {
    const sectionIds = links
      .map(link => link.href)
      .filter(href => href.startsWith("#"))
      .map(href => href.substring(1));

    if (sectionIds.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.5 }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [links]);

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full py-2 transition-colors duration-300",
      scrolled ? "bg-white/95 backdrop-blur-md shadow-sm" : "bg-white/80 backdrop-blur-md",
      className
    )}>
      <div className={cn(
        "flex h-[72px] w-full items-center justify-between px-6 md:px-12 lg:px-16",
        !edgeToEdge && "mx-auto max-w-content"
      )}>
        <div className="flex items-center">{brand}</div>

        {hasLinks && (
          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-6">
              {links.map((link) => {
                const isHashLink = link.href.startsWith("#");
                const isActive = link.active || (isHashLink && activeSection === link.href.substring(1));
                
                return (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      aria-current={isActive ? "page" : undefined}
                      onClick={(e) => {
                        if (isHashLink) {
                          e.preventDefault();
                          const el = document.getElementById(link.href.substring(1));
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth" });
                            setActiveSection(link.href.substring(1));
                          }
                        }
                      }}
                      className={cn(
                        "text-[16px] text-neutral-600 transition-all duration-300 relative group py-1",
                        accentHoverTextClasses[accent],
                        isActive && ["text-[#166534] font-semibold"]
                      )}
                    >
                      {link.label}
                      <span className={cn(
                        "absolute bottom-0 left-0 w-full h-0.5 transform origin-left transition-transform duration-300",
                        isActive ? "scale-x-100 bg-[#166534]" : "scale-x-0 group-hover:scale-x-100 bg-current",
                      )} />
                    </a>
                  </li>
                );
              })}
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
            {links.map((link) => {
              const isHashLink = link.href.startsWith("#");
              const isActive = link.active || (isHashLink && activeSection === link.href.substring(1));
              
              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={(e) => {
                      if (isHashLink) {
                        e.preventDefault();
                        const el = document.getElementById(link.href.substring(1));
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth" });
                          setActiveSection(link.href.substring(1));
                        }
                      }
                      setMobileOpen(false);
                    }}
                    className={cn(
                      "block rounded-md px-3 py-2 text-body-sm text-neutral-600 transition-colors",
                      accentHoverTextClasses[accent],
                      isActive && ["bg-green-50 text-[#166534] font-semibold"]
                    )}
                  >
                    {link.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
