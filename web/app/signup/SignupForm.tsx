"use client";

// Client Component because <form onSubmit> requires a client boundary in the App Router —
// everything else about this page (copy, metadata, OAuth links) stays server-rendered in page.tsx.
//
// Household and Business are kept as distinct top-level choices in the "I'm signing up as"
// selector, not merged into one "USER" option with a secondary dropdown — both share the
// `role: "USER"` permission level today, but their dashboards diverge later, so the distinction
// should be visible from the first interaction. `SignupRoleChoice` is a synthetic local union
// covering all four options; `resolveRoleChoice` derives the `{ role, accountType }` pair the
// backend expects (accountType must be omitted entirely for COLLECTOR/RECYCLING_COMPANY —
// sending it is a 400 VALIDATION_ERROR per api-contract.md §4).
import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Select } from "@/components/Select";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useAuth } from "@/lib/auth/AuthContext";
import { AuthApiError, type AccountType, type SelectableRole } from "@/lib/api/auth";

/** Synthetic value for the flat "I'm signing up as" select — not a wire type. */
export type SignupRoleChoice = "HOUSEHOLD" | "BUSINESS" | "COLLECTOR" | "RECYCLING_COMPANY";

const roleChoiceOptions: { value: SignupRoleChoice; label: string }[] = [
  { value: "HOUSEHOLD", label: "Household" },
  { value: "BUSINESS", label: "Business" },
  { value: "COLLECTOR", label: "Collector (accept pickups)" },
  { value: "RECYCLING_COMPANY", label: "Recycling Company" },
];

/** Derives the `{ role, accountType }` pair docs/api-contract.md §4 expects from a flat choice. */
function resolveRoleChoice(
  choice: SignupRoleChoice
): { role: SelectableRole; accountType?: AccountType } {
  switch (choice) {
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

// Never surface a raw AuthApiError.message for an unmapped code — fall back to something generic.
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
  /** Pre-selected choice, e.g. from the `?role=collector` landing-page CTA. */
  defaultRoleChoice: SignupRoleChoice;
}

export function SignupForm({ defaultRoleChoice }: SignupFormProps) {
  const { signup } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

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
        const roleChoice = String(formData.get("roleChoice") ?? defaultRoleChoice) as SignupRoleChoice;
        const { role, accountType } = resolveRoleChoice(roleChoice);

        setIsSubmitting(true);
        void signup({
          email,
          password,
          fullName,
          role,
          ...(phone ? { phone } : {}),
          ...(accountType ? { accountType } : {}),
        })
          .then(() => {
            router.push("/");
          })
          .catch((err: unknown) => {
            setErrorMessage(resolveSignupErrorMessage(err));
            setIsSubmitting(false);
          });
      }}
    >
      {errorMessage && <ErrorBanner>{errorMessage}</ErrorBanner>}

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
        label="Phone (optional)"
        name="phone"
        type="tel"
        autoComplete="tel"
        placeholder="+8801700000000"
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

      <Select
        label="I'm signing up as"
        name="roleChoice"
        defaultValue={defaultRoleChoice}
        disabled={isSubmitting}
        options={roleChoiceOptions}
      />

      <Button type="submit" fullWidth className="mt-2" disabled={isSubmitting}>
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
