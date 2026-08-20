"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/PageContainer";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { forgotPassword, resetPassword, AuthApiError } from "@/lib/api/auth";

const RESEND_COOLDOWN_SECONDS = 60;

const resetErrorMessages: Record<string, string> = {
  INVALID_CODE: "That code is invalid or has expired. Request a new one below.",
  VALIDATION_ERROR: "Please check that value and try again.",
};

function resolveErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AuthApiError) {
    return resetErrorMessages[err.code] ?? err.message ?? fallback;
  }
  return fallback;
}

export function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = React.useState<"email" | "reset">("email");
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [infoMessage, setInfoMessage] = React.useState<string | null>(null);
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function handleRequestCode(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await forgotPassword({ email: email.trim() });
      setInfoMessage("If an account exists for that email, we've sent a 6-digit code.");
      setStep("reset");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setErrorMessage(resolveErrorMessage(err, "Couldn't send that code. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await forgotPassword({ email: email.trim() });
      setInfoMessage("We've sent a new code to your email.");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setErrorMessage(resolveErrorMessage(err, "Couldn't resend the code. Please try again shortly."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword({ email: email.trim(), code, newPassword });
      router.push("/login?passwordReset=1");
    } catch (err) {
      setErrorMessage(resolveErrorMessage(err, "Couldn't reset your password. Please try again."));
      setIsSubmitting(false);
    }
  }

  return (
    <PageContainer as="main" className="flex min-h-screen items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <a href="/" className="font-heading text-h4 text-neutral-900">
            WasteWise
          </a>
        </div>

        <Card>
          {step === "email" ? (
            <>
              <h1 className="text-h3 text-neutral-900">Forgot your password?</h1>
              <p className="mt-1 text-body-sm text-neutral-500">
                Enter your account email and we&apos;ll send you a 6-digit code to reset your password.
              </p>

              <form className="mt-6 flex flex-col gap-4" onSubmit={(event) => void handleRequestCode(event)}>
                {errorMessage && <ErrorBanner>{errorMessage}</ErrorBanner>}

                <Input
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={isSubmitting}
                />

                <Button type="submit" fullWidth disabled={isSubmitting}>
                  {isSubmitting ? "Sending…" : "Send reset code"}
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-h3 text-neutral-900">Reset your password</h1>
              <p className="mt-1 text-body-sm text-neutral-500">
                Enter the 6-digit code we sent to <span className="font-medium text-neutral-700">{email}</span>{" "}
                along with your new password.
              </p>

              <form className="mt-6 flex flex-col gap-4" onSubmit={(event) => void handleResetPassword(event)}>
                {errorMessage && <ErrorBanner>{errorMessage}</ErrorBanner>}
                {infoMessage && !errorMessage && (
                  <p className="text-body-sm text-success-700">{infoMessage}</p>
                )}

                <Input
                  label="Reset code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  disabled={isSubmitting}
                  required
                />
                <Input
                  label="New password"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  helperText="At least 8 characters."
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={8}
                  disabled={isSubmitting}
                  required
                />
                <Input
                  label="Confirm new password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  disabled={isSubmitting}
                  required
                />

                <Button type="submit" fullWidth disabled={isSubmitting || code.length !== 6}>
                  {isSubmitting ? "Resetting…" : "Reset password"}
                </Button>
              </form>

              <div className="mt-4 flex items-center justify-between text-body-sm">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setErrorMessage(null);
                    setInfoMessage(null);
                  }}
                  className="text-neutral-500 hover:text-neutral-700 underline"
                >
                  Use a different email
                </button>
                <button
                  type="button"
                  onClick={() => void handleResend()}
                  disabled={isSubmitting || cooldown > 0}
                  className="text-primary-700 hover:text-primary-800 disabled:text-neutral-400 disabled:cursor-not-allowed underline"
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                </button>
              </div>
            </>
          )}

          <p className="mt-6 text-center text-body-sm text-neutral-500">
            Remembered your password?{" "}
            <a href="/login" className="text-primary-600 hover:text-primary-700">
              Log in
            </a>
          </p>
        </Card>
      </div>
    </PageContainer>
  );
}
