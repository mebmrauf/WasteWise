"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useAuth } from "@/lib/auth/AuthContext";
import { AuthApiError, type AccountType, type SelectableRole } from "@/lib/api/auth";
import { cn } from "@/lib/utils";

export type SignupRoleChoice = "HOUSEHOLD" | "BUSINESS" | "COLLECTOR" | "RECYCLING_COMPANY";

const roleChoiceCards: {
  value: SignupRoleChoice;
  label: string;
  description: string;
  accent: "user" | "business" | "collector" | "recycler";
}[] = [
  { value: "HOUSEHOLD", label: "Household", description: "Schedule pickups for your home", accent: "user" },
  { value: "BUSINESS", label: "Business", description: "Manage waste for your company", accent: "business" },
  { value: "COLLECTOR", label: "Collector", description: "Pick up and deliver waste", accent: "collector" },
  {
    value: "RECYCLING_COMPANY",
    label: "Recycling Company",
    description: "Buy and process bulk waste",
    accent: "recycler",
  },
];

const roleAccentClasses: Record<
  "user" | "business" | "collector" | "recycler",
  { selected: string; ring: string }
> = {
  user: { selected: "border-role-user-500 bg-role-user-50", ring: "ring-role-user-500" },
  business: { selected: "border-role-business-500 bg-role-business-50", ring: "ring-role-business-500" },
  collector: { selected: "border-role-collector-500 bg-role-collector-50", ring: "ring-role-collector-500" },
  recycler: { selected: "border-role-recycler-500 bg-role-recycler-50", ring: "ring-role-recycler-500" },
};

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
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [roleChoice, setRoleChoice] = React.useState<SignupRoleChoice>(defaultRoleChoice);
  const isPhoneRequired = roleChoice === "COLLECTOR";

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
        const confirmPassword = String(formData.get("confirmPassword") ?? "");
        const { role, accountType } = resolveRoleChoice(roleChoice);

        if (password !== confirmPassword) {
          setErrorMessage("Passwords do not match.");
          return;
        }

        setIsSubmitting(true);
        void signup({
          email,
          password,
          fullName,
          role,
          ...(phone ? { phone } : {}),
          ...(accountType ? { accountType } : {}),
        })
          .then((newUser) => {
            const destination =
              role === "COLLECTOR"
                ? "/collector"
                : role === "RECYCLING_COMPANY"
                  ? "/recycling/dashboard"
                  : role === "USER" && accountType === "BUSINESS"
                    ? "/business/dashboard"
                    : "/dashboard";

            if (!newUser.isEmailVerified) {
              router.push(`/verify-email?redirect=${encodeURIComponent(destination)}`);
              return;
            }
            router.push(destination);
            router.refresh();
          })
          .catch((err: unknown) => {
            setErrorMessage(resolveSignupErrorMessage(err));
            setIsSubmitting(false);
          });
      }}
    >
      {errorMessage && <ErrorBanner>{errorMessage}</ErrorBanner>}

      <div className="flex flex-col gap-1">
        <span className="text-label text-neutral-800">I&apos;m signing up as</span>
        <div role="radiogroup" aria-label="I'm signing up as" className="grid grid-cols-2 gap-2">
          {roleChoiceCards.map((card) => {
            const isSelected = roleChoice === card.value;
            const accent = roleAccentClasses[card.accent];
            return (
              <button
                key={card.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={isSubmitting}
                onClick={() => setRoleChoice(card.value)}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                  isSelected ? accent.selected : "border-neutral-300 bg-neutral-0 hover:border-neutral-400",
                  isSelected && accent.ring,
                  isSubmitting && "cursor-not-allowed opacity-60"
                )}
              >
                <span className="text-body-sm font-semibold text-neutral-900">{card.label}</span>
                <span className="text-xs text-neutral-500">{card.description}</span>
              </button>
            );
          })}
        </div>
      </div>

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
        helperText={isPhoneRequired ? "Required for collector accounts — households use this to reach you." : undefined}
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
      <Input
        label="Confirm password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        disabled={isSubmitting}
      />

      <Button type="submit" fullWidth className="mt-2" disabled={isSubmitting}>
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
