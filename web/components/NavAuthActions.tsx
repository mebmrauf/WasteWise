"use client";

/**
 * NavAuthActions — auth-aware content for NavBar's `actions` slot. Client Component (calls
 * useAuth()) kept separate from the pages that render it, so those pages can stay Server
 * Components — e.g. app/page.tsx needs a page-level `metadata` export.
 *
 * States: loading renders nothing (a brief blank beats a flash of the wrong state); signed in
 * shows a first-name greeting + "Dashboard" link (hidden once already under /dashboard/**,
 * where DashboardNav's own sidebar makes it redundant) + "Log out"; signed out shows "Log in"
 * / "Sign up".
 */
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/auth/AuthContext";

export function NavAuthActions() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isInDashboardShell = pathname?.startsWith("/dashboard") ?? false;

  if (isLoading) {
    return null;
  }

  if (user) {
    const shortName = user.fullName.trim().split(/\s+/)[0] ?? user.fullName;

    return (
      <div className="flex items-center gap-3">
        <span className="text-body-sm text-neutral-600">Hi, {shortName}</span>
        {!isInDashboardShell && (
          <Button variant="ghost" size="sm" href="/dashboard">
            Dashboard
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Catch so a failed server-side revoke doesn't surface as an unhandled rejection —
            // logout() already clears local state regardless, so the redirect still makes sense.
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
