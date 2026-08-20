"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ClipboardList, Gift, HandCoins, MapPin, Megaphone, Truck, User, Camera, LayoutDashboard, Users, Package, Banknote } from "lucide-react";
import { DashboardNav, type DashboardNavItem } from "@/components/DashboardNav";
import { PageContainer } from "@/components/PageContainer";
import { useRequireRole } from "@/lib/auth/AuthContext";

function isPickupDetailRoute(pathname: string | null, segment: "track" | "offers"): boolean {
  if (!pathname) return false;
  return new RegExp(`^/dashboard/pickups/[^/]+/${segment}$`).test(pathname) ||
    new RegExp(`^/dashboard/bulk-pickups/[^/]+/${segment}$`).test(pathname);
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useRequireRole(["USER"], { allowedAccountTypes: ["BUSINESS"], forbiddenRedirectTo: "/dashboard" });
  const pathname = usePathname();
  const onTrackDetail = isPickupDetailRoute(pathname, "track");
  const onOffersDetail = isPickupDetailRoute(pathname, "offers");

  const dashboardNavItems: DashboardNavItem[] = React.useMemo(
    () => {
      return [
        { label: "Dashboard", href: "/business/dashboard", icon: LayoutDashboard },
        { label: "Profile", href: "/business/profile", icon: User },
        { label: "Bulk Marketplace", href: "/business/dashboard/marketplace", icon: Package },
        {
          label: "Pickup History",
          href: "/business/dashboard/pickups",
          icon: ClipboardList,
          active: onTrackDetail || onOffersDetail ? true : undefined,
        },
        { label: "Payment History", href: "/business/dashboard/payments", icon: Banknote },
        { label: "Green Rewards", href: "/business/dashboard/rewards", icon: Gift },
        { label: "Complaints", href: "/business/dashboard/complaints", icon: Megaphone },
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
      <DashboardNav accent="business" roleLabel="BUSINESS PORTAL" items={dashboardNavItems} />
      <div className="pb-16 md:pb-0 md:pl-rail lg:pl-sidebar">{children}</div>
    </>
  );
}
