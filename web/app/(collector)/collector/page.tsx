import type { Metadata } from "next";
import { CollectorDashboardHome } from "./CollectorDashboardHome";

export const metadata: Metadata = {
  title: "Collector Dashboard — WasteWise",
  description: "Browse open pickup requests, place bids, and manage your active job.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Collector Dashboard — WasteWise",
    description: "Browse open pickup requests, place bids, and manage your active job.",
    type: "website",
    siteName: "WasteWise",
  },
};

export default function CollectorDashboardPage() {
  return <CollectorDashboardHome />;
}
