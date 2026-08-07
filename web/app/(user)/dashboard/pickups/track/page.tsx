import type { Metadata } from "next";
import { TrackPickupListView } from "./TrackPickupListView";

export const metadata: Metadata = {
  title: "Track Pickup — WasteWise",
  description: "Follow your collector's live location for any pickup currently on its way.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Track Pickup — WasteWise",
    description: "Follow your collector's live location for any pickup currently on its way.",
    type: "website",
    siteName: "WasteWise",
  },
};

export default function TrackPickupListPage() {
  return <TrackPickupListView />;
}
