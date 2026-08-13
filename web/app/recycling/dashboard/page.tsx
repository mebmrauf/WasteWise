"use client";

import { PageContainer } from "@/components/PageContainer";
import { useAuth } from "@/lib/auth/AuthContext";
import { RecyclingVerificationGate } from "../RecyclingVerificationGate";
import { RecyclingDashboardView } from "./RecyclingDashboardView";

export default function RecyclingDashboardPage() {
  const { user } = useAuth();

  return (
    <PageContainer className="py-8">
      <div className="mb-8">
        <h1 className="text-h2 text-neutral-900 mb-2">Welcome, {user?.fullName}</h1>
        <p className="text-body-lg text-neutral-500">
          Here is your recycling company overview.
        </p>
      </div>

      <RecyclingVerificationGate pendingMessage="Your recycling company account needs to be verified by an admin before you can browse the marketplace or submit quotations. Check back once your profile has been approved.">
        <RecyclingDashboardView />
      </RecyclingVerificationGate>
    </PageContainer>
  );
}
