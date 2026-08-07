import type { ReactNode } from "react";
import { NavBar } from "@/components/NavBar";
import { NavAuthActions } from "@/components/NavAuthActions";
import { DashboardShell } from "./DashboardShell";

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
