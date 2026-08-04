import type { Metadata } from "next";
import { AuthPageShell } from "../_components/AuthPageShell";
import { SignupForm, type SignupRoleChoice } from "./SignupForm";

export const metadata: Metadata = {
  title: "Sign up — WasteWise",
  description:
    "Create a WasteWise account as a household or business, a verified scrap collector, or a recycling company.",
  openGraph: {
    title: "Sign up — WasteWise",
    description:
      "Create a WasteWise account as a household or business, a verified scrap collector, or a recycling company.",
    type: "website",
    siteName: "WasteWise",
  },
};

// Maps the `?role=` query param (e.g. `/signup?role=collector` from the landing-page CTAs)
// onto the flat SignupRoleChoice the select uses. Unrecognized values fall back to "HOUSEHOLD".
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
      <SignupForm defaultRoleChoice={defaultRoleChoice} />
    </AuthPageShell>
  );
}
