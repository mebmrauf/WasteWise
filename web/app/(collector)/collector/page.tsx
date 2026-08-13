"use client";

import * as React from "react";
import { PageContainer } from "@/components/PageContainer";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useRequireRole } from "@/lib/auth/AuthContext";
import { getMyProfile, type UserProfile } from "@/lib/api/users";
import { AlertCircle, CheckCircle2, UserCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { ActiveJobTracker } from "@/components/ActiveJobTracker";
import { CollectorRatingsPanel } from "@/components/CollectorRatingsPanel";
import { CollectorStatsChart } from "@/components/CollectorStatsChart";
import { listAssignedPickups, type PickupRequestSummary } from "@/lib/api/pickups";

export default function CollectorDashboardPage() {
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
      <PageContainer className="flex min-h-[60vh] items-center justify-center py-16">
        <p className="text-body-sm text-neutral-500">Loading…</p>
      </PageContainer>
    );
  }

  if (!user) return null;

  const isApproved = profile?.collectorProfile?.verificationStatus === "APPROVED";
  const hasMissingInfo =
    !profile?.collectorProfile ||
    !profile.collectorProfile.vehicleNumber.trim() ||
    !profile.collectorProfile.licenseNumber.trim() ||
    !profile.collectorProfile.serviceArea.trim();

  return (
    <PageContainer className="py-8 lg:py-12">
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-emerald-100 p-8 mb-8 rounded-2xl shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Dashboard</h1>
        <p className="mt-2 text-neutral-600">
          Welcome back, {profile?.fullName?.split(" ")[0] || "Collector"}! Here is your performance hub. Check your latest reputation feedback and track the waste you've collected.
        </p>
      </Card>

      {!isApproved ? (
        hasMissingInfo ? (
          <Card className="max-w-2xl bg-white border border-neutral-100 shadow-sm rounded-2xl p-8">
            <div className="flex flex-col items-center text-center py-8">
              <UserCircle2 className="h-16 w-16 text-neutral-400 mb-4" />
              <h2 className="text-h2 text-neutral-900 mb-2">Profile incomplete</h2>
              <p className="text-body text-neutral-600 mb-8 max-w-md mx-auto">
                Before an admin can verify your account, you must provide your vehicle and service area details.
              </p>
              <Button onClick={() => router.push("/collector/profile")}>
                Complete my profile
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="max-w-2xl bg-amber-50 border border-amber-100 shadow-sm rounded-2xl p-8">
            <div className="flex flex-col items-center text-center py-8">
              <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
              <h2 className="text-h2 text-warning-900 mb-2">Verification pending</h2>
              <p className="text-body text-warning-800 mb-8 max-w-md mx-auto">
                Your collector account needs to be verified by an admin before you can browse open pickup requests. Check back once your profile has been approved.
              </p>
              <Button onClick={fetchProfile} disabled={isProfileLoading}>
                Check again
              </Button>
            </div>
          </Card>
        )
      ) : (
        <div className="flex flex-col gap-8 w-full max-w-6xl">
          {/* Welcome Hero Removed (Moved to top of page) */}

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
            <CollectorRatingsPanel 
              averageRating={profile?.collectorProfile?.averageRating ?? null}
              totalRatings={profile?.collectorProfile?.totalRatings ?? 0}
            />
            <CollectorStatsChart />
          </div>
        </div>
      )}
    </PageContainer>
  );
}
