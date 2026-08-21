import type { Metadata } from "next";
import { CampaignsView } from "./CampaignsView";

export const metadata: Metadata = {
  title: "Community Campaigns",
  description: "Join upcoming recycling campaigns and workshops, or volunteer to help out.",
  robots: { index: false },
};

export default function CampaignsPage() {
  return <CampaignsView />;
}