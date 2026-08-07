"use client";

import { Navigation, Search, User } from "lucide-react";
import { DashboardFeatureTile } from "@/components/DashboardFeatureTile";
import { PageContainer } from "@/components/PageContainer";
import { useAuth } from "@/lib/auth/AuthContext";

export function CollectorDashboardHome() {
  const { user } = useAuth();

  return (
    <PageContainer className="py-8 lg:py-12">
      <h1 className="text-h1 text-neutral-900">Welcome back{user ? `, ${user.fullName}` : ""}</h1>
      <p className="mt-2 text-body-lg text-neutral-500">
        Browse open pickup requests, place bids, and manage your active job from here.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DashboardFeatureTile
          icon={User}
          label="Profile"
          description="Update your contact details, vehicle type, and service area."
          href="/collector/profile"
          iconClassName="text-role-collector-500"
          labelClassName="text-neutral-900"
          descriptionClassName="text-neutral-500"
        />
        <DashboardFeatureTile
          icon={Search}
          label="Available Jobs"
          description="Browse open pickup requests near you and submit a bid."
          href="/collector/jobs"
          iconClassName="text-role-collector-500"
          labelClassName="text-neutral-900"
          descriptionClassName="text-neutral-500"
        />
        <DashboardFeatureTile
          icon={Navigation}
          label="Active Job"
          description="Track your current assignment, share your live location, and update its status."
          href="/collector/active-job"
          iconClassName="text-role-collector-500"
          labelClassName="text-neutral-900"
          descriptionClassName="text-neutral-500"
        />
      </div>
    </PageContainer>
  );
}
