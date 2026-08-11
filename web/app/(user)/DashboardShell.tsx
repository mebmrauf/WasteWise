"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ClipboardList, Gift, HandCoins, MapPin, Megaphone, Truck, User, Camera, LayoutDashboard, Users, Package } from "lucide-react";
import { DashboardNav, type DashboardNavItem } from "@/components/DashboardNav";
import { PageContainer } from "@/components/PageContainer";
import { useRequireRole } from "@/lib/auth/AuthContext";

function isPickupDetailRoute(pathname: string | null, segment: "track" | "offers"): boolean {
  if (!pathname) return false;
  return new RegExp(`^/dashboard/pickups/[^/]+/${segment}$`).test(pathname) ||
         new RegExp(`^/dashboard/bulk-pickups/[^/]+/${segment}$`).test(pathname);
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useRequireRole(["USER"]);
  const pathname = usePathname();
  const onTrackDetail = isPickupDetailRoute(pathname, "track");
  const onOffersDetail = isPickupDetailRoute(pathname, "offers");

  const dashboardNavItems: DashboardNavItem[] = React.useMemo(
    () => {
      const isBusiness = user?.accountType === "BUSINESS";
      const baseItems: DashboardNavItem[] = [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Profile", href: "/profile", icon: User },
      ];

      if (isBusiness) {
        baseItems.push(
          { label: "Smart Pickup", href: "/dashboard/pickups/new", icon: Truck },
          { label: "Bulk Marketplace", href: "/dashboard/marketplace", icon: Package },
          {
            label: "Pickup History",
            href: "/dashboard/pickups",
            icon: ClipboardList,
            active: onTrackDetail || onOffersDetail ? true : undefined,
          }
        );
      } else {
        baseItems.push(
          { label: "Smart Pickup", href: "/dashboard/pickups/new", icon: Truck },
          {
            label: "Pickup History",
            href: "/dashboard/pickups",
            icon: ClipboardList,
            active: onTrackDetail || onOffersDetail ? true : undefined,
          },
          { label: "Waste Recognition", href: "/waste-recognition", icon: Camera }
        );
      }

      const finalItems = [
        ...baseItems,
        { label: "Green Rewards", href: "/dashboard/rewards", icon: Gift },
      ];

      if (!isBusiness) {
        finalItems.push({ label: "Referral Program", href: "/referrals", icon: Users });
      }

      finalItems.push({ label: "Complaints", href: "/dashboard/complaints", icon: Megaphone });

      return finalItems;
    },
    [onTrackDetail, onOffersDetail, user?.accountType]
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
        accent={user.accountType === "BUSINESS" ? "business" : "user"}
        roleLabel={user.accountType === "BUSINESS" ? "BUSINESS PORTAL" : "USER PORTAL"}
        items={dashboardNavItems}
      />
      <div className="pb-16 md:pb-0 md:pl-rail lg:pl-sidebar">{children}</div>
    </>
  );
}
