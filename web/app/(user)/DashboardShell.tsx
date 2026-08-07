"use client";

// Client-side role gate + DashboardNav mount for every page under the `(user)` route group,
// so the sidebar is one persistent nav rather than something that only appears on /dashboard.
// ProfileView.tsx runs its own useRequireRole call too — harmless duplication, left as-is.
//
// DashboardNav renders `fixed`, so {children} needs matching offsets rather than assuming the
// nav pushes content over on its own: `pb-16 md:pb-0` clears the fixed bottom tab bar below md,
// and `md:pl-rail lg:pl-sidebar` clears the rail/sidebar at wider breakpoints (same
// sidebarWidth/navRailWidth tokens DashboardNav itself uses).
import * as React from "react";
import { ClipboardList, Megaphone, MapPin, Truck, User, Camera } from "lucide-react";
import { DashboardNav, type DashboardNavItem } from "@/components/DashboardNav";
import { PageContainer } from "@/components/PageContainer";
import { useRequireRole } from "@/lib/auth/AuthContext";

const dashboardNavItems: DashboardNavItem[] = [
  { label: "Profile", href: "/profile", icon: User },
  { label: "Smart Pickup Request", href: "/dashboard/pickups/new", icon: Truck },
  { label: "My Pickups", href: "/dashboard/pickups", icon: ClipboardList },
  { label: "Track Pickup", href: "/dashboard/pickups/track", icon: MapPin },
  { label: "Waste Recognition", href: "/waste-recognition", icon: Camera },
  { label: "Complaints", href: "/dashboard/complaints", icon: Megaphone },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useRequireRole(["USER"]);

  if (isLoading) {
    return (
      <PageContainer className="flex min-h-[60vh] items-center justify-center py-16">
        <p className="text-body-sm text-neutral-500">Loading…</p>
      </PageContainer>
    );
  }

  if (!user) {
    // useRequireRole is already redirecting — render nothing rather than flash gated content.
    return null;
  }

  return (
    <>
      <DashboardNav
        accent="user"
        roleLabel="USER PORTAL"
        items={dashboardNavItems}
      />
      <div className="pb-16 md:pb-0 md:pl-rail lg:pl-sidebar">{children}</div>
    </>
  );
}
