import type { Metadata } from "next";
import { OffersListView } from "./OffersListView";

export const metadata: Metadata = {
  title: "Offers — WasteWise",
  description: "Every pickup request of yours that's still open for collector offers.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Offers — WasteWise",
    description: "Every pickup request of yours that's still open for collector offers.",
    type: "website",
    siteName: "WasteWise",
  },
};

export default function OffersListPage() {
  return <OffersListView />;
}
