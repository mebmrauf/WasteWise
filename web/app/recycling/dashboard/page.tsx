"use client";

import { PageContainer } from "@/components/PageContainer";
import { useAuth } from "@/lib/auth/AuthContext";
import { RecyclingVerificationGate } from "../RecyclingVerificationGate";
import { RecyclingDashboardView } from "./RecyclingDashboardView";

export default function RecyclingDashboardPage() {
  const { user } = useAuth();

  return (
    <PageContainer className="py-8 lg:py-12">
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-emerald-100 p-8 mb-8 rounded-2xl shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Dashboard</h1>
        <p className="mt-2 text-neutral-600">
          Welcome back, {user?.fullName?.split(" ")[0] || "Company"}! Here is your performance hub. Check your latest reputation feedback and track the waste you've collected.
        </p>
      </div>

      <RecyclingVerificationGate pendingMessage="Your recycling company account needs to be verified by an admin before you can browse the marketplace or submit quotations. Check back once your profile has been approved.">
        <RecyclingDashboardView />
      </RecyclingVerificationGate>
    </PageContainer>
  );
}
