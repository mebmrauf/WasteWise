import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { ComingSoonPage } from "@/components/ComingSoonPage";

// Authenticated, user-specific page — intentionally left off sitemap.ts.
export const metadata: Metadata = {
  title: "Complaints — WasteWise",
  description: "Report an issue with a pickup and track its resolution.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Complaints — WasteWise",
    description: "Report an issue with a pickup and track its resolution.",
    type: "website",
    siteName: "WasteWise",
  },
};

export default function ComplaintsPage() {
  return (
    <ComingSoonPage
      title="Complaints"
      icon={Megaphone}
      label="Complaints"
      description="File a complaint about a pickup and follow its status through to resolution."
    />
  );
}
