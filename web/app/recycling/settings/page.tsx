import { Metadata } from "next";
import { PageContainer } from "@/components/PageContainer";
import { RecyclingSettingsView } from "./RecyclingSettingsView";

export const metadata: Metadata = {
  title: "Company Profile | WasteWise",
};

export default function RecyclingSettingsPage() {
  return (
    <PageContainer className="py-8">
      <h1 className="text-h2 text-neutral-900 mb-2">Company Profile</h1>
      <p className="text-body-lg text-neutral-500">
        Manage your recycling company details, service areas, and verification status.
      </p>
      
      <RecyclingSettingsView />
    </PageContainer>
  );
}
