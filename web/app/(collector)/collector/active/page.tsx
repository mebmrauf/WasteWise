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
import { listAssignedPickups, type PickupRequestSummary } from "@/lib/api/pickups";

export default function CollectorActiveJobsPage() {
  const { user, isLoading: isAuthLoading } = useRequireRole(["COLLECTOR"]);
  const router = useRouter();
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = React.useState(true);

  const [activeJobs, setActiveJobs] = React.useState<PickupRequestSummary[]>([]);
  const [isActiveJobsLoading, setIsActiveJobsLoading] = React.useState(true);

  const fetchProfile = React.useCallback(() => {
    setIsProfileLoading(true);
    getMyProfile()
      .then((res) => setProfile(res.user))
      .catch(() => setProfile(null))
      .finally(() => setIsProfileLoading(false));
  }, []);

  const fetchActiveJobs = React.useCallback(() => {
    setIsActiveJobsLoading(true);
    listAssignedPickups()
      .then(({ pickups }) => setActiveJobs(pickups))
      .catch(() => setActiveJobs([]))
      .finally(() => setIsActiveJobsLoading(false));
  }, []);

  React.useEffect(() => {
    if (user) {
      fetchProfile();
      fetchActiveJobs();
    } else {
      setIsProfileLoading(false);
      setIsActiveJobsLoading(false);
    }
  }, [user, fetchProfile, fetchActiveJobs]);

  if (isAuthLoading || isProfileLoading || isActiveJobsLoading) {
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
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Active Pickups</h1>
        <p className="mt-2 text-neutral-600">
          Track your current assignments, navigate to locations, and log collected weights.
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
                Your collector account needs to be verified by an admin before you can track active pickups.
              </p>
              <Button onClick={fetchProfile} disabled={isProfileLoading}>
                Check again
              </Button>
            </div>
          </Card>
        )
      ) : (
        <div className="flex flex-col gap-8 w-full max-w-6xl">
          {/* Active Pickups Hero Removed (Moved to top of page) */}

          <section className="w-full">
            {activeJobs.length > 0 ? (
              <ActiveJobTracker />
            ) : (
              <Card className="flex flex-col items-center justify-center p-12 text-center bg-neutral-50 border border-dashed border-neutral-300 shadow-none min-h-[300px]">
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4 shadow-sm">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">No active pickups</h3>
                <p className="text-sm text-neutral-500 mb-6 max-w-sm mx-auto">
                  You don't have any ongoing pickups right now. Head over to the Find Jobs page to secure your next run!
                </p>
                <Button onClick={() => router.push("/collector/jobs")} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Find Jobs
                </Button>
              </Card>
            )}
          </section>
        </div>
      )}
    </PageContainer>
  );
}
