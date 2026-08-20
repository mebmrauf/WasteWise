import { AuthPageShell } from "../_components/AuthPageShell";
import { Suspense } from "react";
import { SignupForm, type SignupRoleChoice } from "./SignupForm";


const roleParamToChoice: Record<string, SignupRoleChoice> = {
  USER: "HOUSEHOLD",
  INDIVIDUAL: "HOUSEHOLD",
  BUSINESS: "BUSINESS",
  COLLECTOR: "COLLECTOR",
  RECYCLING_COMPANY: "RECYCLING_COMPANY",
};

function resolveDefaultRoleChoice(roleParam: string | string[] | undefined): SignupRoleChoice {
  const candidate = Array.isArray(roleParam) ? roleParam[0] : roleParam;
  const normalized = candidate?.toUpperCase() ?? "";
  return roleParamToChoice[normalized] ?? "HOUSEHOLD";
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string | string[]; referral?: string | string[]; ref?: string | string[] }>;
}) {
  const resolvedSearchParams = await searchParams;
  const defaultRoleChoice = resolveDefaultRoleChoice(resolvedSearchParams.role);
  const rawReferral = resolvedSearchParams.ref || resolvedSearchParams.referral;
  const defaultReferralCode = typeof rawReferral === "string" ? rawReferral : (Array.isArray(rawReferral) ? rawReferral[0] : null);

  return (
    <AuthPageShell
      title="Create your account"
      subtitle="Post pickups, offer collection routes, or source verified bulk waste — pick what fits below."
      footerNote={
        <>
          Already have an account?{" "}
          <a href="/login" className="text-primary-600 hover:text-primary-700">
            Log in
          </a>
        </>
      }
    >
      <Suspense fallback={<div className="flex justify-center p-8 text-neutral-500">Loading signup...</div>}>
        <SignupForm defaultRoleChoice={defaultRoleChoice} defaultReferralCode={defaultReferralCode} />
      </Suspense>
    </AuthPageShell>
  );
}
