"use client";

import * as React from "react";
import { Search, User, LayoutDashboard, Briefcase, History, Megaphone, Banknote } from "lucide-react";
import { DashboardNav, type DashboardNavItem } from "@/components/DashboardNav";
import { PageContainer } from "@/components/PageContainer";
import { useRequireRole } from "@/lib/auth/AuthContext";
import { getMyProfile, type UserProfile } from "@/lib/api/users";

const ALL_NAV_ITEMS: DashboardNavItem[] = [
  { label: "Dashboard", href: "/collector", icon: LayoutDashboard },
  { label: "Active Pickups", href: "/collector/active", icon: Briefcase },
  { label: "Find Jobs", href: "/collector/jobs", icon: Search },
  { label: "History", href: "/collector/collection-history", icon: History },
  { label: "Payment History", href: "/collector/payment-history", icon: Banknote },
  { label: "Complaints", href: "/collector/complaints", icon: Megaphone },
  { label: "Profile", href: "/collector/profile", icon: User },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useRequireRole(["COLLECTOR"]);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = React.useState(true);

  React.useEffect(() => {
    if (user) {
      getMyProfile()
        .then((res) => setProfile(res.user))
        .catch(() => setProfile(null))
        .finally(() => setIsProfileLoading(false));
    } else {
      setIsProfileLoading(false);
    }
  }, [user]);

  if (isLoading || isProfileLoading) {
    return (
      <PageContainer className="flex min-h-[60vh] items-center justify-center py-16">
        <p className="text-body-sm text-neutral-500">Loading…</p>
      </PageContainer>
    );
  }

  if (!user) {
    return null;
  }

  const navItems = ALL_NAV_ITEMS;

  return (
    <>
      <DashboardNav accent="collector" roleLabel="COLLECTOR PORTAL" items={navItems} />
      <div className="pb-16 md:pb-0 md:pl-rail lg:pl-sidebar">{children}</div>
    </>
  );
}
