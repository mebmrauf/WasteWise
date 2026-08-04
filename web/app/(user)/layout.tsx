import type { ReactNode } from "react";
import { NavBar } from "@/components/NavBar";
import { NavAuthActions } from "@/components/NavAuthActions";
import { DashboardShell } from "./DashboardShell";

// Shared chrome for every page under the `(user)` route group (household/business account
// area: /profile, /dashboard/**). `(user)` never appears in the URL — Next.js route-group
// convention. No `links` on NavBar: the way back to /dashboard lives in NavAuthActions, which
// hides itself once you're already under /dashboard/**.
//
// DashboardShell wraps {children} so the DashboardNav sidebar/rail/bottom-bar is a persistent
// nav across the whole group, not something that only appears once you're on /dashboard. It
// mounts below NavBar (own role-gating, own loading state) rather than replacing it.
export default function UserLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <NavBar
        brand={
          <a href="/" className="font-heading text-h4 text-neutral-900">
            WasteWise
          </a>
        }
        accent="user"
        actions={<NavAuthActions />}
      />
      <main>
        <DashboardShell>{children}</DashboardShell>
      </main>
    </>
  );
}
