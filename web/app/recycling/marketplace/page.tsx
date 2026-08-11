import { Metadata } from "next";
import { PageContainer } from "@/components/PageContainer";

export const metadata: Metadata = {
  title: "Bulk Marketplace | WasteWise",
};

export default function RecyclingMarketplacePage() {
  return (
    <PageContainer className="py-8">
      <h1 className="text-h2 text-neutral-900 mb-2">Marketplace</h1>
      <p className="text-body-lg text-neutral-500 mb-8">
        Browse open bulk requests from businesses and submit your quotations.
      </p>
      
      <div className="rounded-2xl border border-neutral-200 bg-neutral-0 p-8 text-center">
        <h3 className="text-h4 text-neutral-900">No open requests right now</h3>
        <p className="mt-2 text-body text-neutral-500">
          Check back later for new bulk waste requests in your area.
        </p>
      </div>
    </PageContainer>
  );
}
