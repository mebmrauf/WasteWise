"use client";

import { PageContainer } from "@/components/PageContainer";
import { useAuth } from "@/lib/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RecyclingDashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "RECYCLING_COMPANY")) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) return null;

  const session = user;

  return (
    <PageContainer className="py-8">
      <h1 className="text-h2 text-neutral-900 mb-2">Welcome, {session.fullName}</h1>
      <p className="text-body-lg text-neutral-500 mb-8">
        Here is your recycling company overview.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-0 p-6 shadow-sm">
          <p className="text-overline text-neutral-500">Open Marketplace Requests</p>
          <p className="text-display mt-2 text-role-recycler-700">12</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-neutral-0 p-6 shadow-sm">
          <p className="text-overline text-neutral-500">My Active Bids</p>
          <p className="text-display mt-2 text-role-recycler-700">3</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-neutral-0 p-6 shadow-sm">
          <p className="text-overline text-neutral-500">Completed Pickups</p>
          <p className="text-display mt-2 text-role-recycler-700">0</p>
        </div>
      </div>
    </PageContainer>
  );
}
