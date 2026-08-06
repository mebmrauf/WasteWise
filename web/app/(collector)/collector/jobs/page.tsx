import type { Metadata } from "next";
import { AvailableJobsView } from "./AvailableJobsView";

export const metadata: Metadata = {
  title: "Available Jobs — WasteWise",
  description: "Browse open pickup requests near you and submit a bid.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Available Jobs — WasteWise",
    description: "Browse open pickup requests near you and submit a bid.",
    type: "website",
    siteName: "WasteWise",
  },
};

export default function AvailableJobsPage() {
  return <AvailableJobsView />;
}
