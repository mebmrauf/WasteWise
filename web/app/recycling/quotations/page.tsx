import { Metadata } from "next";
import { PageContainer } from "@/components/PageContainer";
import { RecyclingVerificationGate } from "../RecyclingVerificationGate";
import { RecyclingQuotationsView } from "./RecyclingQuotationsView";

export const metadata: Metadata = {
  title: "My Quotations | WasteWise",
};

export default function RecyclingQuotationsPage() {
  return (
    <PageContainer className="py-8">
      <h1 className="text-h2 text-neutral-900 mb-2">My Quotations</h1>
      <p className="text-body-lg text-neutral-500 mb-8">
        Track the status of your submitted quotations.
      </p>

      <RecyclingVerificationGate pendingMessage="Your recycling company account needs to be verified by an admin before you can track quotations. Check back once your profile has been approved.">
        <RecyclingQuotationsView />
      </RecyclingVerificationGate>
    </PageContainer>
  );
}
