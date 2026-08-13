"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Store, ClipboardList, Settings, Truck } from "lucide-react";
import { DashboardNav, type DashboardNavItem } from "@/components/DashboardNav";
import { PageContainer } from "@/components/PageContainer";
import { useRequireRole } from "@/lib/auth/AuthContext";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useRequireRole(["RECYCLING_COMPANY"]);
  const pathname = usePathname();

  const dashboardNavItems: DashboardNavItem[] = React.useMemo(
    () => [
      { label: "Dashboard", href: "/recycling/dashboard", icon: LayoutDashboard },
      { label: "Marketplace", href: "/recycling/marketplace", icon: Store },
      { label: "My Quotations", href: "/recycling/quotations", icon: ClipboardList },
      { label: "Accepted Collections", href: "/recycling/accepted-collections", icon: Truck },
      { label: "Collection History", href: "/recycling/collection-history", icon: ClipboardList },
      { label: "Settings", href: "/recycling/settings", icon: Settings },
    ],
    []
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
      <DashboardNav accent="recyclingCompany" roleLabel="RECYCLING COMPANY" items={dashboardNavItems} />
      <div className="pb-16 md:pb-0 md:pl-rail lg:pl-sidebar">{children}</div>
    </>
  );
}
