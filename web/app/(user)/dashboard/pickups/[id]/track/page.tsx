import type { Metadata } from "next";
import { TrackPickupView } from "./TrackPickupView";

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

export default async function TrackPickupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TrackPickupView pickupId={id} />;
}
