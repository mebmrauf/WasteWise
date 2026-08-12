"use client";

import * as React from "react";
import { PageContainer } from "@/components/PageContainer";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useRequireRole } from "@/lib/auth/AuthContext";
import { getMyProfile, type UserProfile } from "@/lib/api/users";
import { AlertCircle, Briefcase } from "lucide-react";
import { useRouter } from "next/navigation";

export interface BusinessVerificationGateProps {
  children: React.ReactNode;
  incompleteMessage?: string;
  pendingMessage?: string;
}

/**
 * Blocks business pages behind admin verification, mirroring the collector
 * and recycling-company portal gates (see RecyclingVerificationGate.tsx).
 */
export function BusinessVerificationGate({
  children,
  incompleteMessage = "Before an admin can verify your business, you must provide your trade license or registration number.",
  pendingMessage = "Your business account needs to be verified by an admin before you can post Bulk Marketplace Requests. Check back once your profile has been approved.",
}: BusinessVerificationGateProps) {
  const { user, isLoading: isAuthLoading } = useRequireRole(["USER"], { allowedAccountTypes: ["BUSINESS"] });
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

  const isApproved = profile?.businessProfile?.verificationStatus === "APPROVED";
  if (isApproved) return <>{children}</>;

  const hasMissingInfo = !profile?.businessProfile || !profile.businessProfile.tradeLicenseNumber?.trim();

  return hasMissingInfo ? (
    <Card className="max-w-2xl bg-white border border-neutral-100 shadow-sm rounded-2xl p-8">
      <div className="flex flex-col items-center text-center py-8">
        <Briefcase className="h-16 w-16 text-neutral-400 mb-4" />
        <h2 className="text-h2 text-neutral-900 mb-2">Profile incomplete</h2>
        <p className="text-body text-neutral-600 mb-8 max-w-md mx-auto">{incompleteMessage}</p>
        <Button onClick={() => router.push("/business/profile")}>Complete my profile</Button>
      </div>
    </Card>
  ) : (
    <Card className="max-w-2xl bg-amber-50 border border-amber-100 shadow-sm rounded-2xl p-8">
      <div className="flex flex-col items-center text-center py-8">
        <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
        <h2 className="text-h2 text-warning-900 mb-2">Verification pending</h2>
        <p className="text-body text-warning-800 mb-8 max-w-md mx-auto">{pendingMessage}</p>
        <Button onClick={fetchProfile} disabled={isProfileLoading}>
          Check again
        </Button>
      </div>
    </Card>
  );
}
