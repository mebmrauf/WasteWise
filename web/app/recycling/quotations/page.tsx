import { Metadata } from "next";
import { PageContainer } from "@/components/PageContainer";

export const metadata: Metadata = {
  title: "My Quotations | WasteWise",
};

export default function RecyclingQuotationsPage() {
  return (
    <PageContainer className="py-8">
      <h1 className="text-h2 text-neutral-900 mb-2">My Quotations</h1>
      <p className="text-body-lg text-neutral-500 mb-8">
        Track the status of bids you've submitted to businesses.
      </p>
      
      <div className="rounded-2xl border border-neutral-200 bg-neutral-0 p-8 text-center">
        <h3 className="text-h4 text-neutral-900">No active quotations</h3>
        <p className="mt-2 text-body text-neutral-500">
          You haven't submitted any quotations yet. Head to the Marketplace to find opportunities.
        </p>
      </div>
    </PageContainer>
  );
}
