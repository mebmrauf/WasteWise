import { AuthPageShell } from "../_components/AuthPageShell";
import { Suspense } from "react";
import { SignupForm, type SignupRoleChoice } from "./SignupForm";


const roleParamToChoice: Record<string, SignupRoleChoice> = {
  HOUSEHOLD: "HOUSEHOLD",
  BUSINESS: "BUSINESS",
  COLLECTOR: "COLLECTOR",
  RECYCLING_COMPANY: "RECYCLING_COMPANY",
};

function resolveDefaultRoleChoice(roleParam: string | string[] | undefined): SignupRoleChoice {
  const candidate = Array.isArray(roleParam) ? roleParam[0] : roleParam;
  const normalized = candidate?.toUpperCase() ?? "";
  return roleParamToChoice[normalized] ?? "HOUSEHOLD";
}

export default function SignupPage({
  searchParams,
}: {
  searchParams: { role?: string | string[] };
}) {
  const defaultRoleChoice = resolveDefaultRoleChoice(searchParams.role);

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
        <SignupForm defaultRoleChoice={defaultRoleChoice} />
      </Suspense>
    </AuthPageShell>
  );
}
