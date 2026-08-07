import type { Metadata } from "next";
import { ActiveJobView } from "./ActiveJobView";

export const metadata: Metadata = {
  title: "Active Job — WasteWise",
  description: "Track your current assignment, share your live location, and update its status.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Active Job — WasteWise",
    description: "Track your current assignment, share your live location, and update its status.",
    type: "website",
    siteName: "WasteWise",
  },
};

export default function ActiveJobPage() {
  return <ActiveJobView />;
}
