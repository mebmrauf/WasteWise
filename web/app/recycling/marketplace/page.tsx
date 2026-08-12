import { Metadata } from "next";
import { PageContainer } from "@/components/PageContainer";
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
      
      <RecyclingMarketplaceView />
    </PageContainer>
  );
}
