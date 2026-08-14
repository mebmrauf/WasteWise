"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ClipboardList, Gift, HandCoins, MapPin, Megaphone, Truck, User, Camera, LayoutDashboard, Users, Package, BadgeCheck } from "lucide-react";
import { DashboardNav, type DashboardNavItem } from "@/components/DashboardNav";
import { PageContainer } from "@/components/PageContainer";
import { useRequireRole } from "@/lib/auth/AuthContext";

function isPickupDetailRoute(pathname: string | null, segment: "track" | "offers"): boolean {
  if (!pathname) return false;
  return new RegExp(`^/dashboard/pickups/[^/]+/${segment}$`).test(pathname) ||
    new RegExp(`^/dashboard/bulk-pickups/[^/]+/${segment}$`).test(pathname);
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useRequireRole(["USER"], { allowedAccountTypes: ["HOUSEHOLD"] });
  const pathname = usePathname();
  const onTrackDetail = isPickupDetailRoute(pathname, "track");
  const onOffersDetail = isPickupDetailRoute(pathname, "offers");

  const dashboardNavItems: DashboardNavItem[] = React.useMemo(
    () => {
      return [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Profile", href: "/profile", icon: User },
        { label: "Smart Pickup", href: "/dashboard/pickups/new", icon: Truck },
        {
          label: "Pickup History",
          href: "/dashboard/pickups",
          icon: ClipboardList,
          active: onTrackDetail || onOffersDetail ? true : undefined,
        },
        { label: "Find a Collector", href: "/dashboard/collectors", icon: BadgeCheck },
        { label: "Waste Recognition", href: "/waste-recognition", icon: Camera },
        { label: "Green Rewards", href: "/dashboard/rewards", icon: Gift },
        { label: "Referral Program", href: "/referrals", icon: Users },
        { label: "Complaints", href: "/dashboard/complaints", icon: Megaphone },
      ];
    },
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
      <DashboardNav accent="user" roleLabel="USER PORTAL" items={dashboardNavItems} />
      <div className="pb-16 md:pb-0 md:pl-rail lg:pl-sidebar">{children}</div>
    </>
  );
}
