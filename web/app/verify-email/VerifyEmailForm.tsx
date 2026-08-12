"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/PageContainer";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useAuth } from "@/lib/auth/AuthContext";
import { verifyEmail, resendVerificationEmail, AuthApiError } from "@/lib/api/auth";

const RESEND_COOLDOWN_SECONDS = 60;

const verifyErrorMessages: Record<string, string> = {
  INVALID_CODE: "That code is invalid or has expired. Request a new one below.",
  VALIDATION_ERROR: "Enter the 6-digit code from your email.",
};

function resolveErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AuthApiError) {
    return verifyErrorMessages[err.code] ?? err.message ?? fallback;
  }
  return fallback;
}

export function VerifyEmailForm() {
  const { user, isLoading, refetchUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/";

  const [code, setCode] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [resendMessage, setResendMessage] = React.useState<string | null>(null);
  const [isResending, setIsResending] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.isEmailVerified) {
      router.replace(redirectTarget);
    }
  }, [isLoading, user, redirectTarget, router]);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await verifyEmail(code);
      await refetchUser();
      router.push(redirectTarget);
    } catch (err) {
      setErrorMessage(resolveErrorMessage(err, "Couldn't verify that code. Please try again."));
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setResendMessage(null);
    setErrorMessage(null);
    setIsResending(true);
    try {
      await resendVerificationEmail();
      setResendMessage("We've sent a new code to your email.");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setErrorMessage(resolveErrorMessage(err, "Couldn't resend the code. Please try again shortly."));
    } finally {
      setIsResending(false);
    }
  }

  if (isLoading || !user || user.isEmailVerified) {
    return (
      <PageContainer className="flex min-h-[60vh] items-center justify-center py-16">
        <p className="text-body-sm text-neutral-500">Loading…</p>
      </PageContainer>
    );
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
          <h1 className="text-h3 text-neutral-900">Verify your email</h1>
          <p className="mt-1 text-body-sm text-neutral-500">
            We sent a 6-digit code to <span className="font-medium text-neutral-700">{user.email}</span>. Enter it
            below to verify your account.
          </p>

          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
            {errorMessage && <ErrorBanner>{errorMessage}</ErrorBanner>}
            {resendMessage && !errorMessage && (
              <p className="text-body-sm text-success-700">{resendMessage}</p>
            )}

            <Input
              label="Verification code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder=""
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              disabled={isSubmitting}
              required
            />

            <Button type="submit" fullWidth disabled={isSubmitting || code.length !== 6}>
              {isSubmitting ? "Verifying…" : "Verify email"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={isResending || cooldown > 0}
              className="text-body-sm text-primary-700 hover:text-primary-800 disabled:text-neutral-400 disabled:cursor-not-allowed underline"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : isResending ? "Sending…" : "Resend code"}
            </button>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
