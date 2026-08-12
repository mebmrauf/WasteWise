"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useAuth } from "@/lib/auth/AuthContext";
import { AuthApiError } from "@/lib/api/auth";

const loginErrorMessages: Record<string, string> = {
  INVALID_CREDENTIALS: "That email/phone or password isn't right. Please try again.",
  OAUTH_ONLY_ACCOUNT:
    "This account was created with Google or Facebook and doesn't have a password. Please continue with Google or Facebook instead.",
};

function resolveLoginErrorMessage(err: unknown): string {
  if (err instanceof AuthApiError) {
    return loginErrorMessages[err.code] ?? "Something went wrong logging you in. Please try again.";
  }
  return "Something went wrong logging you in. Please try again.";
}

export function LoginForm() {
  const { login, logout } = useAuth();
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
        const identifier = String(formData.get("identifier") ?? "");
        const password = String(formData.get("password") ?? "");

        setIsSubmitting(true);
        void login({ identifier, password })
          .then(async (user) => {
            if (user.role === "ADMIN") {
              await logout();
              setErrorMessage("That email/phone or password isn't right. Please try again.");
              setIsSubmitting(false);
              return;
            }
            const destination =
              user.role === "COLLECTOR"
                ? "/collector"
                : user.role === "RECYCLING_COMPANY"
                  ? "/recycling/dashboard"
                  : user.role === "USER" && user.accountType === "BUSINESS"
                    ? "/business/dashboard"
                    : "/dashboard";

            if (!user.isEmailVerified) {
              router.push(`/verify-email?redirect=${encodeURIComponent(destination)}`);
              return;
            }
            router.push(destination);
            router.refresh();
          })
          .catch((err: unknown) => {
            setErrorMessage(resolveLoginErrorMessage(err));
            setIsSubmitting(false);
          });
      }}
    >
      {errorMessage && <ErrorBanner>{errorMessage}</ErrorBanner>}

      <Input
        label="Email or phone"
        name="identifier"
        autoComplete="username"
        required
        disabled={isSubmitting}
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        disabled={isSubmitting}
      />

      <Button type="submit" fullWidth className="mt-2" disabled={isSubmitting}>
        {isSubmitting ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
