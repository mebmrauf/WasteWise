import { Metadata } from "next";
import { PageContainer } from "@/components/PageContainer";
import { RecyclingVerificationGate } from "../RecyclingVerificationGate";
import { RecyclingMarketplaceView } from "./RecyclingMarketplaceView";

export const metadata: Metadata = {
  title: "Bulk Marketplace | WasteWise",
};

export default function RecyclingMarketplacePage() {
  return (
    <PageContainer className="py-8">
      <h1 className="text-h2 text-neutral-900 mb-2">Bulk Marketplace</h1>
      <p className="text-body-lg text-neutral-500 mb-8">
        Browse open bulk requests from businesses and submit your quotations.
      </p>

      <RecyclingVerificationGate pendingMessage="Your recycling company account needs to be verified by an admin before you can browse the marketplace or submit quotations. Check back once your profile has been approved.">
        <RecyclingMarketplaceView />
      </RecyclingVerificationGate>
    </PageContainer>
  );
}
