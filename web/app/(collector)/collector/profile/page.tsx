import type { Metadata } from "next";
import { CollectorProfileView } from "./CollectorProfileView";

export const metadata: Metadata = {
  title: "Your profile — WasteWise",
  description: "Manage your contact details, vehicle, and service area as a WasteWise collector.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Your profile — WasteWise",
    description: "Manage your contact details, vehicle, and service area as a WasteWise collector.",
    type: "website",
    siteName: "WasteWise",
  },
};

export default function CollectorProfilePage() {
  return <CollectorProfileView />;
}
