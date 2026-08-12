"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Select } from "@/components/Select";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useAuth } from "@/lib/auth/AuthContext";
import { AuthApiError, type AccountType, type SelectableRole } from "@/lib/api/auth";

export type SignupRoleChoice = "HOUSEHOLD" | "BUSINESS" | "COLLECTOR" | "RECYCLING_COMPANY";

const roleChoiceOptions: { value: SignupRoleChoice; label: string }[] = [
  { value: "HOUSEHOLD", label: "Household" },
  { value: "BUSINESS", label: "Business" },
  { value: "COLLECTOR", label: "Collector" },
  { value: "RECYCLING_COMPANY", label: "Recycling Company" },
];

function resolveRoleAndAccountType(
  roleChoice: SignupRoleChoice
): { role: SelectableRole; accountType?: AccountType } {
  switch (roleChoice) {
    case "HOUSEHOLD":
      return { role: "USER", accountType: "HOUSEHOLD" };
    case "BUSINESS":
      return { role: "USER", accountType: "BUSINESS" };
    case "COLLECTOR":
      return { role: "COLLECTOR" };
    case "RECYCLING_COMPANY":
      return { role: "RECYCLING_COMPANY" };
  }
}

const signupErrorMessages: Record<string, string> = {
  VALIDATION_ERROR:
    "Please check your details — make sure your email is valid and your password is at least 8 characters.",
  ACCOUNT_EXISTS: "An account with that email or phone number already exists. Try logging in instead.",
};

function resolveSignupErrorMessage(err: unknown): string {
  if (err instanceof AuthApiError) {
    return signupErrorMessages[err.code] ?? "Something went wrong creating your account. Please try again.";
  }
  return "Something went wrong creating your account. Please try again.";
}

export interface SignupFormProps {
  defaultRoleChoice: SignupRoleChoice;
}

export function SignupForm({ defaultRoleChoice }: SignupFormProps) {
  const { signup } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [roleChoice, setRoleChoice] = React.useState<SignupRoleChoice>(defaultRoleChoice);
  const [clearedReferral, setClearedReferral] = React.useState(false);
  const isPhoneRequired = roleChoice === "COLLECTOR";
  const defaultReferralCode = searchParams.get("ref") ?? "";
  const isReferralReadOnly = Boolean(defaultReferralCode) && !clearedReferral;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setErrorMessage(null);

        const formData = new FormData(event.currentTarget);
        const fullName = String(formData.get("fullName") ?? "");
        const email = String(formData.get("email") ?? "");
        const phone = String(formData.get("phone") ?? "").trim();
        const password = String(formData.get("password") ?? "");
        const referralCode = String(formData.get("referralCode") ?? "").trim();
        const { role, accountType: resolvedAccountType } = resolveRoleAndAccountType(roleChoice);

        setIsSubmitting(true);
        void signup({
          email,
          password,
          fullName,
          role,
          ...(phone ? { phone } : {}),
          ...(resolvedAccountType ? { accountType: resolvedAccountType } : {}),
          ...(referralCode ? { referralCode } : {}),
        })
          .then(() => {
            if (role === "COLLECTOR") { router.push("/collector"); } else if (role === "RECYCLING_COMPANY") { router.push("/recycling/dashboard"); } else if (role === "USER" && resolvedAccountType === "BUSINESS") { router.push("/business/dashboard"); } else { router.push("/dashboard"); } router.refresh();
          })
          .catch((err: unknown) => {
            setErrorMessage(resolveSignupErrorMessage(err));
            setIsSubmitting(false);
          });
      }}
    >
      {errorMessage && <ErrorBanner>{errorMessage}</ErrorBanner>}

      <Select
        label="I'm signing up as"
        name="roleChoice"
        value={roleChoice}
        onChange={(event) => setRoleChoice(event.target.value as SignupRoleChoice)}
        disabled={isSubmitting}
        options={roleChoiceOptions}
      />

      <Input label="Full name" name="fullName" autoComplete="name" required disabled={isSubmitting} />
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        disabled={isSubmitting}
      />
      <Input
        label={isPhoneRequired ? "Phone" : "Phone (optional)"}
        name="phone"
        type="tel"
        autoComplete="tel"
        placeholder="+8801700000000"
        required={isPhoneRequired}
        helperText={isPhoneRequired ? "Required for collector accounts — individual users use this to reach you." : undefined}
        disabled={isSubmitting}
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        helperText="At least 8 characters."
        required
        minLength={8}
        disabled={isSubmitting}
      />
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-end">
          <label className="text-label text-neutral-800">Referral Code (Optional)</label>
          {isReferralReadOnly && (
            <button
              type="button"
              onClick={() => setClearedReferral(true)}
              className="text-xs text-neutral-500 hover:text-neutral-700 underline"
            >
              Clear
            </button>
          )}
        </div>
        <Input
          name="referralCode"
          defaultValue={clearedReferral ? "" : defaultReferralCode}
          readOnly={isReferralReadOnly}
          disabled={isSubmitting}
          className={isReferralReadOnly ? "bg-neutral-100" : ""}
        />
      </div>

      <Button type="submit" fullWidth className="mt-2" disabled={isSubmitting}>
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
