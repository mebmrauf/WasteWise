import type { Metadata } from "next";
import { ProfileView } from "./ProfileView";

// Authenticated, user-specific page — not indexable, intentionally left off sitemap.ts.
// Real metadata still matters for the browser tab / share-preview case.
export const metadata: Metadata = {
  title: "Your profile — WasteWise",
  description:
    "View and update your WasteWise contact details, address, avatar, and notification preferences.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Your profile — WasteWise",
    description:
      "View and update your WasteWise contact details, address, avatar, and notification preferences.",
    type: "website",
    siteName: "WasteWise",
  },
};

export default function ProfilePage() {
  return <ProfileView />;
}
