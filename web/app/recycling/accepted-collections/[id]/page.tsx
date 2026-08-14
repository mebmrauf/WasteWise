import { Metadata } from "next";
import { PageContainer } from "@/components/PageContainer";
import { CollectionWorkflowView } from "./CollectionWorkflowView";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Collection Workflow | WasteWise",
};

export default async function CollectionWorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return (
    <PageContainer className="py-8">
      <div className="mb-6">
        <Link href="/recycling/accepted-collections" className="inline-flex items-center text-emerald-600 hover:text-emerald-700 text-body-sm font-medium mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Accepted Collections
        </Link>
        <h1 className="text-h2 text-neutral-900 mb-2">Collection Workflow</h1>
        <p className="text-body-lg text-neutral-500">
          Manage the collection process and submit verification proofs.
        </p>
      </div>
      
      <CollectionWorkflowView requestId={resolvedParams.id} />
    </PageContainer>
  );
}
