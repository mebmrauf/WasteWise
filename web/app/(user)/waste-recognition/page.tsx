import type { Metadata } from "next";
import { WasteRecognitionView } from "./WasteRecognitionView";

// Authenticated, user-specific page — not indexable, intentionally left off sitemap.ts.
// Real metadata still matters for the browser tab / share-preview case.
export const metadata: Metadata = {
  title: "Waste recognition — WasteWise",
  description: "Upload a photo to identify waste type and check recyclability.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Waste recognition — WasteWise",
    description: "Upload a photo to identify waste type and check recyclability.",
    type: "website",
    siteName: "WasteWise",
  },
};

export default function WasteRecognitionPage() {
  return <WasteRecognitionView />;
}