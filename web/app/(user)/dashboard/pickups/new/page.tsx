import type { Metadata } from "next";
import { Truck } from "lucide-react";
import { ComingSoonPage } from "@/components/ComingSoonPage";

// Authenticated, user-specific page — intentionally left off sitemap.ts.
export const metadata: Metadata = {
  title: "Smart Pickup Request — WasteWise",
  description: "Request a recycling pickup and get matched with a nearby collector.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Smart Pickup Request — WasteWise",
    description: "Request a recycling pickup and get matched with a nearby collector.",
    type: "website",
    siteName: "WasteWise",
  },
};

export default function NewPickupRequestPage() {
  return (
    <ComingSoonPage
      title="Smart Pickup Request"
      icon={Truck}
      label="Smart Pickup Request"
      description="Schedule a recycling pickup and get matched with a nearby collector based on your waste type and location."
    />
  );
}
