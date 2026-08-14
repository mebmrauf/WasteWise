import type { ReactNode } from "react";
import { NavBar } from "@/components/NavBar";
import { NavAuthActions } from "@/components/NavAuthActions";
import { DashboardShell } from "./DashboardShell";

export default function UserLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <NavBar
        brand={
          <a href="/" className="font-brand text-2xl font-bold tracking-wide text-primary-700 md:hidden">
            WasteWise
          </a>
        }
        accent="business"
        actions={<NavAuthActions />}
        fullWidth
      />
      <main>
        <DashboardShell>{children}</DashboardShell>
      </main>
    </>
  );
}
