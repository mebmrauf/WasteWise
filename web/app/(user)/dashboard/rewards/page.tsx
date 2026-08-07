import type { Metadata } from "next";
import { RewardsView } from "./RewardsView";

export const metadata: Metadata = {
  title: "Green Rewards — WasteWise",
  description: "Track your Green Points balance and redeem them for a mobile recharge.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Green Rewards — WasteWise",
    description: "Track your Green Points balance and redeem them for a mobile recharge.",
    type: "website",
    siteName: "WasteWise",
  },
};

export default function RewardsPage() {
  return <RewardsView />;
}
