import type { ReactNode } from "react";
import { NavBar } from "@/components/NavBar";
import { NavAuthActions } from "@/components/NavAuthActions";
import { DashboardShell } from "./DashboardShell";

export default function CollectorLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <NavBar
        brand={
          <a href="/" className="font-heading text-h4 text-neutral-900">
            WasteWise
          </a>
        }
        accent="collector"
        actions={<NavAuthActions />}
        edgeToEdge
      />
      <main>
        <DashboardShell>{children}</DashboardShell>
      </main>
    </>
  );
}
