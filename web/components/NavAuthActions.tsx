"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Role } from "@/lib/api/auth";

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
      <div className="flex items-center gap-3">
        <span className="text-body-sm text-neutral-600">Hi, {shortName}</span>
        {!isInDashboardShell && (
          <Button variant="ghost" size="sm" href={dashboardHomeHref}>
            Dashboard
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            void logout()
              .catch(() => undefined)
              .finally(() => {
                router.push("/");
              });
          }}
        >
          Log out
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
