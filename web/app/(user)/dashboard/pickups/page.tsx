import type { Metadata } from "next";
import { MyPickupsView } from "./MyPickupsView";

export const metadata: Metadata = {
  title: "My Pickups — WasteWise",
  description: "Review your past pickups, verified weights, and household recycling history.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "My Pickups — WasteWise",
    description: "Review your past pickups, verified weights, and household recycling history.",
    type: "website",
    siteName: "WasteWise",
  },
};

export default function MyPickupsPage() {
  return <MyPickupsView />;
}
