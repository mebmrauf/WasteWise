"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";
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

  useEffect(() => {
    if (user && !isLoading && pathname === "/") {
      const dashboardHomeHref = DASHBOARD_HOME_BY_ROLE[user.role] ?? "/dashboard";
      router.replace(dashboardHomeHref);
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading) {
    const isDashboardRoute = pathname?.startsWith("/dashboard") || pathname?.startsWith("/collector") || pathname?.startsWith("/admin");

    if (isDashboardRoute) {
      return (
        <div className="flex items-center gap-1 sm:gap-3 opacity-50 pointer-events-none">
          <NotificationsPanel />
          <Button variant="ghost" size="sm" className="px-2 sm:px-3 md:hidden">
            <Icon icon={LogOut} size="sm" className="sm:hidden" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="sm" href="/login" className="px-2 sm:px-3 text-body-sm sm:text-body">
          Log in
        </Button>
        <Button size="sm" href="/signup" className="px-2 sm:px-3 text-body-sm sm:text-body">
          Sign up
        </Button>
      </div>
    );
  }

  if (user) {
    const shortName = user.fullName.trim().split(/\s+/)[0] ?? user.fullName;
    const dashboardHomeHref = DASHBOARD_HOME_BY_ROLE[user.role] ?? "/dashboard";
    const isInDashboardShell = pathname?.startsWith(dashboardHomeHref) ?? false;

    return (
      <div className="flex items-center gap-1 sm:gap-3">
        <NotificationsPanel />
        <span className={cn(
          "text-body-sm text-neutral-600",
          isInDashboardShell ? "hidden" : "hidden sm:inline"
        )}>
          Hi, {shortName}
        </span>
        {!isInDashboardShell && (
          <Button variant="ghost" size="sm" href={dashboardHomeHref} className="hidden sm:inline-flex">
            Dashboard
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "px-2 sm:px-3 text-neutral-500 hover:text-error-600",
            isInDashboardShell && "md:hidden"
          )}
          title="Log out"
          onClick={() => {
            void logout()
              .catch(() => undefined)
              .finally(() => {
                router.push("/");
              });
          }}
        >
          <span className={cn(isInDashboardShell ? "hidden" : "hidden sm:inline")}>Log out</span>
          <Icon icon={LogOut} size="sm" className={cn(!isInDashboardShell && "sm:hidden")} />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Button variant="ghost" size="sm" href="/login" className="px-2 sm:px-3 text-body-sm sm:text-body">
        Log in
      </Button>
      <Button size="sm" href="/signup" className="px-2 sm:px-3 text-body-sm sm:text-body">
        Sign up
      </Button>
    </div>
  );
}
