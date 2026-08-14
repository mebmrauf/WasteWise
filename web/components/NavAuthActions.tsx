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
  ADMIN: "/admin",
  RECYCLING_COMPANY: "/recycling/dashboard",
};

function isInDashboardShellPath(
  pathname: string | null,
  role: Role,
  accountType: "HOUSEHOLD" | "BUSINESS" | null,
): boolean {
  if (!pathname) return false;
  if (role === "USER" && accountType === "BUSINESS") {
    return pathname.startsWith("/business");
  }
  if (role === "USER") {
    return (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/waste-recognition") ||
      pathname.startsWith("/referrals")
    );
  }
  if (role === "COLLECTOR") return pathname.startsWith("/collector");
  if (role === "RECYCLING_COMPANY") return pathname.startsWith("/recycling");
  if (role === "ADMIN") return pathname.startsWith("/admin");
  return false;
}

export function NavAuthActions() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (user && !isLoading && pathname === "/") {
      let dashboardHomeHref = DASHBOARD_HOME_BY_ROLE[user.role] ?? "/dashboard";
      if (user.role === "USER" && user.accountType === "BUSINESS") {
        dashboardHomeHref = "/business/dashboard";
      }
      router.replace(dashboardHomeHref);
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading) {
    const isDashboardRoute =
      pathname?.startsWith("/dashboard") ||
      pathname?.startsWith("/collector") ||
      pathname?.startsWith("/admin") ||
      pathname?.startsWith("/business") ||
      pathname?.startsWith("/recycling") ||
      pathname?.startsWith("/profile") ||
      pathname?.startsWith("/waste-recognition") ||
      pathname?.startsWith("/referrals");

    if (isDashboardRoute) {
      return (
        <div className="flex items-center gap-1 sm:gap-3 opacity-50 pointer-events-none">
          <Button variant="ghost" size="sm" className="px-2 sm:px-3 md:hidden">
            <Icon icon={LogOut} size="sm" className="sm:hidden" />
          </Button>
          <NotificationsPanel />
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="sm" href="/login" className="px-3 h-10 text-[16px] font-medium text-neutral-600 hover:text-[#114E29] transition-colors">
          Log in
        </Button>
        <Button size="sm" href="/signup" className="px-5 h-10 text-[16px] bg-[#114E29] hover:bg-green-800 text-white rounded-full transition-all duration-300 shadow-sm hover:shadow font-medium border-none">
          Get Started
        </Button>
      </div>
    );
  }

  if (user) {
    const shortName = user.fullName.trim().split(/\s+/)[0] ?? user.fullName;
    let dashboardHomeHref = DASHBOARD_HOME_BY_ROLE[user.role] ?? "/dashboard";
    if (user.role === "USER" && user.accountType === "BUSINESS") {
      dashboardHomeHref = "/business/dashboard";
    }
    const isInDashboardShell = isInDashboardShellPath(pathname, user.role, user.accountType);

    return (
      <div className="flex items-center gap-1 sm:gap-3">
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
        <NotificationsPanel />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-4">
      <Button variant="ghost" size="sm" href="/login" className="px-3 h-10 text-[16px] font-medium text-neutral-600 hover:text-[#114E29] transition-colors">
        Log in
      </Button>
      <Button size="sm" href="/signup" className="px-5 h-10 text-[16px] bg-[#114E29] hover:bg-green-800 text-white rounded-full transition-all duration-300 shadow-sm hover:shadow font-medium border-none">
        Get Started
      </Button>
    </div>
  );
}
