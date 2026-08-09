"use client";

import * as React from "react";
import { PageContainer } from "@/components/PageContainer";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useRequireRole } from "@/lib/auth/AuthContext";
import { getMyProfile, type UserProfile } from "@/lib/api/users";
import { AlertCircle, UserCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { AvailableJobsBoard } from "@/components/AvailableJobsBoard";

export default function CollectorJobsPage() {
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
      <h1 className="text-h1 text-neutral-900 mb-8">Find Jobs</h1>

      {!isApproved ? (
        hasMissingInfo ? (
          <Card className="max-w-2xl bg-neutral-50 border-neutral-200">
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
          <Card className="max-w-2xl bg-warning-50 border-warning-200">
            <div className="flex flex-col items-center text-center py-8">
              <AlertCircle className="h-16 w-16 text-warning-500 mb-4" />
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
        <div className="flex flex-col gap-12 w-full max-w-5xl">
          <section className="w-full">
            <AvailableJobsBoard />
          </section>
        </div>
      )}
    </PageContainer>
  );
}
