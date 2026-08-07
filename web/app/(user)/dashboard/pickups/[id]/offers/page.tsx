import type { Metadata } from "next";
import { PickupOffersView } from "./PickupOffersView";

export const metadata: Metadata = {
  title: "Pickup Offers — WasteWise",
  description: "Review offers from collectors on your pickup request and accept one.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Pickup Offers — WasteWise",
    description: "Review offers from collectors on your pickup request and accept one.",
    type: "website",
    siteName: "WasteWise",
  },
};

export default async function PickupOffersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PickupOffersView pickupId={id} />;
}
