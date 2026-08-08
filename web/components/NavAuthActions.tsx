"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Role } from "@/lib/api/auth";
import { NotificationsPanel } from "@/components/NotificationsPanel";

const DASHBOARD_HOME_BY_ROLE: Partial<Record<Role, string>> = {
  COLLECTOR: "/collector",
};

export function NavAuthActions() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (isLoading) {
    return null;
  }

  if (user) {
    const shortName = user.fullName.trim().split(/\s+/)[0] ?? user.fullName;
    const dashboardHomeHref = DASHBOARD_HOME_BY_ROLE[user.role] ?? "/dashboard";
    const isInDashboardShell = pathname?.startsWith(dashboardHomeHref) ?? false;

    return (
      <div className="flex items-center gap-1 sm:gap-3">
        <NotificationsPanel />
        <span className="hidden sm:inline text-body-sm text-neutral-600">Hi, {shortName}</span>
        {!isInDashboardShell && (
          <Button variant="ghost" size="sm" href={dashboardHomeHref} className="hidden sm:inline-flex">
            Dashboard
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="px-2 sm:px-3 text-neutral-500 hover:text-error-600"
          title="Log out"
          onClick={() => {
            void logout()
              .catch(() => undefined)
              .finally(() => {
                router.push("/");
              });
          }}
        >
          <span className="hidden sm:inline">Log out</span>
          <Icon icon={LogOut} size="sm" className="sm:hidden" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="sm" href="/login">
        Log in
      </Button>
      <Button size="sm" href="/signup">
        Sign up
      </Button>
    </div>
  );
}
