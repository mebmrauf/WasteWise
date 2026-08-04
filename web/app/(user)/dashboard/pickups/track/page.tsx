import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { ComingSoonPage } from "@/components/ComingSoonPage";

// Authenticated, user-specific page — intentionally left off sitemap.ts.
export const metadata: Metadata = {
  title: "Track Pickup — WasteWise",
  description: "Follow your collector's live location on the way to your scheduled pickup.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Track Pickup — WasteWise",
    description: "Follow your collector's live location on the way to your scheduled pickup.",
    type: "website",
    siteName: "WasteWise",
  },
};

export default function TrackPickupPage() {
  return (
    <ComingSoonPage
      title="Track Pickup"
      icon={MapPin}
      label="Track Pickup"
      description="Real-time tracking of your collector's route and estimated arrival, right from your dashboard."
    />
  );
}
