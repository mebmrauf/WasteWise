"use client";

import * as React from "react";
import { PageContainer } from "@/components/PageContainer";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useRequireRole } from "@/lib/auth/AuthContext";
import { getMyProfile, type UserProfile } from "@/lib/api/users";
import { AlertCircle, UserCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { RoutePlannerView } from "@/components/RoutePlannerView";

export default function CollectorRoutePage() {
  const { user, isLoading: isAuthLoading } = useRequireRole(["COLLECTOR"]);
  const router = useRouter();
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = React.useState(true);

  const fetchProfile = React.useCallback(() => {
    setIsProfileLoading(true);
    getMyProfile()
      .then((res) => setProfile(res.user))
      .catch(() => setProfile(null))
      .finally(() => setIsProfileLoading(false));
  }, []);

  React.useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setIsProfileLoading(false);
    }
  }, [user, fetchProfile]);

  if (isAuthLoading || isProfileLoading) {
    return (
      <PageContainer className="flex min-h-[60vh] items-center justify-center py-16 bg-[#FAFAFA]">
        <p className="text-body-sm text-neutral-500 font-medium">Loading…</p>
      </PageContainer>
    );
  }

  if (!user) return null;

  const isApproved = profile?.collectorProfile?.verificationStatus === "APPROVED";
  const hasMissingInfo =
    !profile?.collectorProfile ||
    !profile.collectorProfile.vehicleNumber.trim() ||
    !profile.collectorProfile.licenseNumber.trim() ||
    !profile.collectorProfile.serviceArea?.trim();

  return (
    <PageContainer className="py-8 lg:py-10 bg-[#FAFAFA] min-h-screen">
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-emerald-100 p-8 mb-8 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">My Route</h1>
          <p className="mt-2 text-neutral-600">
            Manage your daily collection route
          </p>
        </div>
      </Card>

      {hasMissingInfo ? (
        <Card className="max-w-xl bg-white border border-neutral-200 shadow-sm rounded-xl p-8 mt-4">
          <div className="flex flex-col items-center text-center py-4">
            <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
              <UserCircle2 className="h-6 w-6 text-neutral-400" />
            </div>
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-2">Profile incomplete</h2>
            <p className="text-sm text-neutral-500 mb-6 max-w-sm mx-auto">
              You must provide your vehicle and service area details before you can plan a route.
            </p>
            <Button onClick={() => router.push("/collector/profile")} className="bg-[#EA580C] hover:bg-[#C2410C] text-white border-0">
              Complete my profile
            </Button>
          </div>
        </Card>
      ) : !isApproved ? (
        <Card className="max-w-xl bg-white border border-amber-200 shadow-sm rounded-xl p-8 mt-4">
          <div className="flex flex-col items-center text-center py-4">
            <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-amber-500" />
            </div>
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-2">Verification pending</h2>
            <p className="text-sm text-neutral-500 mb-6 max-w-sm mx-auto">
              Your collector account needs to be verified by an admin before you can plan a route. Check back once your profile has been approved.
            </p>
            <Button onClick={fetchProfile} disabled={isProfileLoading} variant="secondary" className="border-neutral-200">
              Check again
            </Button>
          </div>
        </Card>
      ) : (
        <div className="w-full">
          <RoutePlannerView />
        </div>
      )}
    </PageContainer>
  );
}
