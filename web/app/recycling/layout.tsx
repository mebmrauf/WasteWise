import { NavBar } from "@/components/NavBar";
import { NavAuthActions } from "@/components/NavAuthActions";
import { DashboardShell } from "./DashboardShell";

export default function RecyclingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar
        brand={
          <a href="/" className="font-heading text-h4 text-neutral-900">
            WasteWise
          </a>
        }
        accent="recyclingCompany"
        actions={<NavAuthActions />}
        edgeToEdge
      />
      <main>
        <DashboardShell>{children}</DashboardShell>
      </main>
    </>
  );
}
