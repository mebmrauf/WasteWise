"use client";

import * as React from "react";
import { Navigation, Search, User } from "lucide-react";
import { DashboardNav, type DashboardNavItem } from "@/components/DashboardNav";
import { PageContainer } from "@/components/PageContainer";
import { useRequireRole } from "@/lib/auth/AuthContext";

const dashboardNavItems: DashboardNavItem[] = [
  { label: "Profile", href: "/collector/profile", icon: User },
  { label: "Available Jobs", href: "/collector/jobs", icon: Search },
  { label: "Active Job", href: "/collector/active-job", icon: Navigation },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useRequireRole(["COLLECTOR"]);

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
        accent="collector"
        roleLabel="COLLECTOR PORTAL"
        items={dashboardNavItems}
      />
      <div className="pb-16 md:pb-0 md:pl-rail lg:pl-sidebar">{children}</div>
    </>
  );
}
