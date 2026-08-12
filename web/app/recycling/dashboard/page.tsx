"use client";

import { PageContainer } from "@/components/PageContainer";
import { useAuth } from "@/lib/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { RecyclingDashboardView } from "./RecyclingDashboardView";

export default function RecyclingDashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "RECYCLING_COMPANY")) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) return null;

  return (
    <PageContainer className="py-8">
      <div className="mb-8">
        <h1 className="text-h2 text-neutral-900 mb-2">Welcome, {user.fullName}</h1>
        <p className="text-body-lg text-neutral-500">
          Here is your recycling company overview.
        </p>
      </div>

      <RecyclingDashboardView />
    </PageContainer>
  );
}
