import { Metadata } from "next";
import { BusinessVerificationGate } from "../../../BusinessVerificationGate";
import { MarketplaceView } from "./MarketplaceView";

export const metadata: Metadata = {
  title: "Bulk Marketplace | WasteWise",
};

export default function MarketplacePage() {
  return (
    <BusinessVerificationGate pendingMessage="Your business account needs to be verified by an admin before you can post Bulk Marketplace Requests. Check back once your profile has been approved.">
      <MarketplaceView />
    </BusinessVerificationGate>
  );
}
