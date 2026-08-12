import { Metadata } from "next";
import { MarketplaceView } from "./MarketplaceView";

export const metadata: Metadata = {
  title: "Bulk Marketplace | WasteWise",
};

export default function MarketplacePage() {
  return <MarketplaceView />;
}
