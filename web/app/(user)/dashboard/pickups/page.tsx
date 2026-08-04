import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { ComingSoonPage } from "@/components/ComingSoonPage";

// Authenticated, user-specific page — intentionally left off sitemap.ts.
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
  return (
    <ComingSoonPage
      title="My Pickups"
      icon={ClipboardList}
      label="My Pickups"
      description="See every past pickup, its verified weight, and your full household recycling history in one place."
    />
  );
}
