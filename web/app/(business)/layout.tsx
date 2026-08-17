import type { ReactNode } from "react";
import { NavBar } from "@/components/NavBar";
import { NotificationsPanel } from "@/components/NotificationsPanel";
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
<<<<<<< Updated upstream
        actions={<NavAuthActions />}
=======
        actions={<NotificationsPanel />}
        edgeToEdge
>>>>>>> Stashed changes
      />
      <main>
        <DashboardShell>{children}</DashboardShell>
      </main>
    </>
  );
}
