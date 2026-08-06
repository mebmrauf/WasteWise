"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ClipboardList, Gift, HandCoins, MapPin, Megaphone, Truck, User } from "lucide-react";
import { DashboardNav, type DashboardNavItem } from "@/components/DashboardNav";
import { PageContainer } from "@/components/PageContainer";
import { useRequireRole } from "@/lib/auth/AuthContext";

function isPickupDetailRoute(pathname: string | null, segment: "track" | "offers"): boolean {
  if (!pathname) return false;
  return new RegExp(`^/dashboard/pickups/[^/]+/${segment}$`).test(pathname);
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useRequireRole(["USER"]);
  const pathname = usePathname();
  const onTrackDetail = isPickupDetailRoute(pathname, "track");
  const onOffersDetail = isPickupDetailRoute(pathname, "offers");

  const dashboardNavItems: DashboardNavItem[] = React.useMemo(
    () => [
      { label: "Profile", href: "/profile", icon: User },
      { label: "Smart Pickup Request", href: "/dashboard/pickups/new", icon: Truck },
      {
        label: "My Pickups",
        href: "/dashboard/pickups",
        icon: ClipboardList,
        active: onTrackDetail || onOffersDetail ? false : undefined,
      },
      {
        label: "Offers",
        href: "/dashboard/pickups/offers",
        icon: HandCoins,
        active: onOffersDetail ? true : undefined,
      },
      {
        label: "Track Pickup",
        href: "/dashboard/pickups/track",
        icon: MapPin,
        active: onTrackDetail ? true : undefined,
      },
      { label: "Complaints", href: "/dashboard/complaints", icon: Megaphone },
      { label: "Green Rewards", href: "/dashboard/rewards", icon: Gift },
    ],
    [onTrackDetail, onOffersDetail]
  );

  if (isLoading) {
    return (
      <PageContainer className="flex min-h-[60vh] items-center justify-center py-16">
        <p className="text-body-sm text-neutral-500">Loading…</p>
      </PageContainer>
    );
  }

  if (!user) {
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
