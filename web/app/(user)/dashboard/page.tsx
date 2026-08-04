import type { Metadata } from "next";
import { DashboardHome } from "./DashboardHome";

// Authenticated, user-specific page — intentionally left off sitemap.ts (see that file).
export const metadata: Metadata = {
  title: "Dashboard — WasteWise",
  description:
    "Your WasteWise household dashboard — request pickups, track collections, and manage your recycling activity.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Dashboard — WasteWise",
    description:
      "Your WasteWise household dashboard — request pickups, track collections, and manage your recycling activity.",
    type: "website",
    siteName: "WasteWise",
  },
};

export default function DashboardPage() {
  return <DashboardHome />;
}
