"use client";

import { ClipboardList, Megaphone, MapPin, Truck, User } from "lucide-react";
import { ComingSoonCard } from "@/components/ComingSoonCard";
import { DashboardFeatureTile } from "@/components/DashboardFeatureTile";
import { PageContainer } from "@/components/PageContainer";
import { useAuth } from "@/lib/auth/AuthContext";

export function DashboardHome() {
  const { user } = useAuth();

  return (
    <PageContainer className="py-8 lg:py-12">
      <h1 className="text-h1 text-neutral-900">Welcome back{user ? `, ${user.fullName}` : ""}</h1>
      <p className="mt-2 text-body-lg text-neutral-500">
        Request pickups, track collections, and manage your recycling activity from here.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardFeatureTile
          icon={User}
          label="Profile"
          description="View and update your contact details, address, and notification preferences."
          href="/profile"
          iconClassName="text-primary-600"
          labelClassName="text-neutral-900"
          descriptionClassName="text-neutral-500"
        />

        <ComingSoonCard
          icon={Truck}
          label="Smart Pickup Request"
          description="Schedule a recycling pickup and get matched with a nearby collector."
        />
        <ComingSoonCard
          icon={ClipboardList}
          label="My Pickups"
          description="Review your past pickups, verified weights, and recycling history."
        />
        <ComingSoonCard
          icon={MapPin}
          label="Track Pickup"
          description="Follow your collector's live location on the way to your pickup."
        />
        <ComingSoonCard
          icon={Megaphone}
          label="Complaints"
          description="Report an issue with a pickup and track its resolution."
        />
      </div>
    </PageContainer>
  );
}
