"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/Avatar";
import { resolveAvatarUrl } from "@/lib/api/users";
import type { RoleAccent } from "@/components/NavBar";
import { cn } from "@/lib/utils";

export interface DashboardNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  active?: boolean;
}

export interface DashboardNavProps {
  items: DashboardNavItem[];
  accent: RoleAccent;
  roleLabel: string;
  brand?: React.ReactNode;
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const sidebarFillClasses: Record<RoleAccent, string> = {
  user: "bg-role-user-900/90 backdrop-blur-md border-r border-white/10 shadow-xl",
  business: "bg-role-business-900/90 backdrop-blur-md border-r border-white/10 shadow-xl",
  collector: "bg-role-collector-900/90 backdrop-blur-md border-r border-white/10 shadow-xl",
  recyclingCompany: "bg-role-recycler-900/90 backdrop-blur-md border-r border-white/10 shadow-xl",
  admin: "bg-role-admin-900/90 backdrop-blur-md border-r border-white/10 shadow-xl",
};

const activePillFillClasses: Record<RoleAccent, string> = {
  user: "bg-role-user-500",
  business: "bg-role-business-500",
  collector: "bg-role-collector-500",
  recyclingCompany: "bg-role-recycler-500",
  admin: "bg-role-admin-500",
};

const ringOffsetClasses: Record<RoleAccent, string> = {
  user: "focus-visible:ring-offset-role-user-900",
  business: "focus-visible:ring-offset-role-business-900",
  collector: "focus-visible:ring-offset-role-collector-900",
  recyclingCompany: "focus-visible:ring-offset-role-recycler-900",
  admin: "focus-visible:ring-offset-role-admin-900",
};

const mobileActiveTextClasses: Record<RoleAccent, string> = {
  user: "text-role-user-500",
  business: "text-role-business-500",
  collector: "text-role-collector-500",
  recyclingCompany: "text-role-recycler-500",
  admin: "text-role-admin-500",
};

const darkSurfaceFocusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-0 focus-visible:ring-offset-2";

const lightSurfaceFocusRing = "focus-visible:outline-none focus-visible:shadow-focus";

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
        if (item.href === "/") continue;
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

export function DashboardNav({
  items,
  accent,
  roleLabel,
  brand,
  className,
  isCollapsed = false,
  onToggleCollapse,
}: DashboardNavProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const shortName = user?.fullName.trim().split(/\s+/)[0] ?? user?.fullName;
  const activeStates = React.useMemo(() => resolveActiveStates(items, pathname), [items, pathname]);
  const mobileScrollable = items.length > 5;
  const mobileItems = mobileScrollable ? items : items.slice(0, 5);

  return (
    <>
      {/* Desktop — fixed full sidebar (lg+, §6.4) */}
      <nav
        aria-label="Primary"
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 hidden w-sidebar shrink-0 flex-col overflow-y-auto overflow-x-hidden overscroll-contain lg:flex",
          isCollapsed && "lg:hidden",
          sidebarFillClasses[accent],
          className
        )}
      >
        <div className="flex shrink-0 items-start justify-between px-6 py-4 border-b border-white/10">
          <div className="flex flex-col justify-center">
            <Link href="/" className="font-brand text-3xl font-bold tracking-wide text-white drop-shadow-md leading-none">
              WasteWise
            </Link>
            <span className="text-[10px] uppercase tracking-wider text-white/60 mt-1 font-medium">
              Formalizing Waste Management
            </span>
          </div>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className={cn(
                "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white",
                darkSurfaceFocusRing,
                ringOffsetClasses[accent]
              )}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <Icon icon={ChevronLeft} size="sm" />
            </button>
          )}
        </div>
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
                  onClick={(e) => {
                    if (isActive && pathname === item.href) {
                      e.preventDefault();
                      window.location.reload();
                    }
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-4 rounded-md px-4 py-3 text-body-sm font-medium transition-colors",
                    darkSurfaceFocusRing,
                    ringOffsetClasses[accent],
                    isActive
                      ? cn(activePillFillClasses[accent], "text-neutral-0")
                      : "text-neutral-0/80 hover:text-neutral-0"
                  )}
                >
                  <div className={cn("flex items-center justify-center h-8 w-8 rounded-full shrink-0 transition-colors", isActive ? "bg-white/20" : "bg-white/5 group-hover:bg-white/10")}>
                    <Icon icon={item.icon} size="sm" />
                  </div>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-auto px-4 pb-4">
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <div className="flex items-center gap-3 overflow-hidden">
              <Avatar
                name={user?.fullName || "User"}
                src={resolveAvatarUrl(user?.avatarUrl ?? null)}
                size="sm"
                accent={accent}
                className="shrink-0 ring-1 ring-white/20"
              />
              <span className="truncate text-body-sm font-medium text-white">
                {user?.fullName || "User"}
              </span>
            </div>
            <button
              onClick={() => {
                void logout().catch(() => undefined).finally(() => {
                  window.location.href = "/";
                });
              }}
              className="ml-2 shrink-0 text-neutral-400 transition-colors hover:text-white"
              title="Log out"
            >
              <Icon icon={LogOut} size="sm" />
            </button>
          </div>
        </div>
      </nav>

      {/* Tablet — icon-only collapsed rail (md to just under lg, §6.4). Also
          used at lg+ when the desktop sidebar is manually collapsed. */}
      <nav
        aria-label="Primary (compact)"
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 hidden w-rail shrink-0 flex-col items-center overflow-y-auto overflow-x-hidden overscroll-contain lg:hidden md:flex",
          isCollapsed && "lg:flex",
          sidebarFillClasses[accent]
        )}
      >
        <div className="flex h-16 w-full shrink-0 items-center justify-center border-b border-white/10">
          <Link href="/" className="font-brand text-3xl font-bold text-white drop-shadow-md" aria-label="WasteWise Home">
            W
          </Link>
        </div>
        {onToggleCollapse && (
          <div className="hidden w-full shrink-0 items-center justify-center border-b border-white/10 py-2 lg:flex">
            <button
              onClick={onToggleCollapse}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white",
                darkSurfaceFocusRing,
                ringOffsetClasses[accent]
              )}
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <Icon icon={ChevronRight} size="sm" />
            </button>
          </div>
        )}
        <ul className="flex flex-col items-center gap-1 pt-6">
          {items.map((item, index) => {
            const isActive = activeStates[index];
            return (
              <li key={item.href} className="group relative">
                <Link
                  href={item.href}
                  title={item.label}
                  aria-label={item.label}
                  onClick={(e) => {
                    if (isActive && pathname === item.href) {
                      e.preventDefault();
                      window.location.reload();
                    }
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
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
        <div className="mt-auto pb-4">
          <button
            onClick={() => {
              void logout().catch(() => undefined).finally(() => {
                window.location.href = "/";
              });
            }}
            className="group relative flex h-12 w-12 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white border border-transparent hover:border-white/5"
            title="Log out"
          >
            <Icon icon={LogOut} size="md" />
            <span
              role="tooltip"
              aria-hidden="true"
              className="pointer-events-none absolute left-full top-1/2 z-10 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-neutral-800 px-3 py-1 text-caption text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            >
              Log out
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile — bottom tab bar (below md, §6.4) */}
      <div className="fixed inset-x-4 bottom-4 z-50 md:hidden">
        <nav
          aria-label="Primary (mobile)"
          className={cn(
            "flex h-16 items-stretch rounded-2xl glass-panel-dark shadow-lg border border-white/10 overflow-hidden",
            mobileScrollable && "overflow-x-auto"
          )}
        >
          <ul className="flex w-full items-stretch">
            {mobileItems.map((item, index) => {
              const isActive = activeStates[index];
            return (
              <li key={item.href} className={mobileScrollable ? "min-w-[72px] shrink-0" : "flex-1 overflow-hidden"}>
                <Link
                  href={item.href}
                  onClick={(e) => {
                    if (isActive && pathname === item.href) {
                      e.preventDefault();
                      window.location.reload();
                    }
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex h-full w-full flex-col items-center justify-center gap-1 text-caption transition-colors overflow-hidden px-1",
                    lightSurfaceFocusRing,
                    isActive ? "text-white bg-white/10" : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  <div className={cn("flex items-center justify-center h-8 w-8 rounded-full shrink-0 transition-colors", isActive ? "bg-white/20" : "bg-transparent")}>
                    <Icon icon={item.icon} size="sm" className="shrink-0" />
                  </div>
                  <span className="w-full truncate text-center text-[10px] leading-tight">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        </nav>
      </div>
    </>
  );
}
