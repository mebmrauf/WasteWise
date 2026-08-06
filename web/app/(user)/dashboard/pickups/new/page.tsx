import type { Metadata } from "next";
import { NewPickupRequestView } from "./NewPickupRequestView";

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
  return <NewPickupRequestView />;
}
