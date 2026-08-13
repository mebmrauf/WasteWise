"use client";

import * as React from "react";
import { PageContainer } from "@/components/PageContainer";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useRequireRole } from "@/lib/auth/AuthContext";
import { getMyProfile, type UserProfile } from "@/lib/api/users";
import { AlertCircle, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";

export interface RecyclingVerificationGateProps {
  children: React.ReactNode;
  incompleteMessage?: string;
  pendingMessage?: string;
}

/**
 * Blocks recycling-company pages behind admin verification, mirroring the
 * collector portal's per-page gate (see app/(collector)/collector/page.tsx).
 */
export function RecyclingVerificationGate({
  children,
  incompleteMessage = "Before an admin can verify your company, you must provide your service areas and accepted waste materials.",
  pendingMessage = "Your recycling company account needs to be verified by an admin before you can continue. Check back once your profile has been approved.",
}: RecyclingVerificationGateProps) {
  const { user, isLoading: isAuthLoading } = useRequireRole(["RECYCLING_COMPANY"]);
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

  const isApproved = profile?.recyclingCompanyProfile?.verificationStatus === "APPROVED";
  if (isApproved) return <>{children}</>;

  const hasMissingInfo =
    !profile?.recyclingCompanyProfile ||
    profile.recyclingCompanyProfile.serviceAreas.length === 0 ||
    profile.recyclingCompanyProfile.acceptedWasteMaterials.length === 0;

  return hasMissingInfo ? (
    <Card className="max-w-2xl bg-white border border-neutral-100 shadow-sm rounded-2xl p-8">
      <div className="flex flex-col items-center text-center py-8">
        <Building2 className="h-16 w-16 text-neutral-400 mb-4" />
        <h2 className="text-h2 text-neutral-900 mb-2">Profile incomplete</h2>
        <p className="text-body text-neutral-600 mb-8 max-w-md mx-auto">{incompleteMessage}</p>
        <Button onClick={() => router.push("/recycling/settings")}>Complete my profile</Button>
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
