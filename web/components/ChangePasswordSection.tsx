"use client";

import * as React from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Input } from "@/components/Input";
import { AuthApiError } from "@/lib/api/auth";
import { changeMyPassword } from "@/lib/api/users";

const changePasswordErrorMessages: Record<string, string> = {
  CURRENT_PASSWORD_REQUIRED: "Enter your current password.",
  INVALID_PASSWORD: "That current password is incorrect.",
  VALIDATION_ERROR: "Please check that value and try again.",
};

export interface ChangePasswordSectionProps {
  hasPassword: boolean;
}

export function ChangePasswordSection({ hasPassword }: ChangePasswordSectionProps) {
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setIsSaving(true);
    try {
      await changeMyPassword({
        ...(hasPassword ? { currentPassword } : {}),
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
    } catch (err) {
      if (err instanceof AuthApiError) {
        setError(changePasswordErrorMessages[err.code] ?? err.message);
      } else {
        setError("Couldn't update your password. Try again.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="mt-8 p-6 md:p-8 bg-white rounded-2xl shadow-sm border border-neutral-100 transition-all">
      <h3 className="text-xl font-bold text-neutral-900 mb-2">
        {hasPassword ? "Change password" : "Set a password"}
      </h3>
      <p className="text-body-sm text-neutral-600 mb-6 max-w-form">
        {hasPassword
          ? "Update the password you use to sign in."
          : "Your account currently only signs in via Google or Facebook. Set a password to also sign in with your email."}
      </p>

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4 max-w-sm">
        {error && <ErrorBanner>{error}</ErrorBanner>}
        {success && !error && (
          <p className="text-body-sm text-success-700">Your password has been updated.</p>
        )}

        {hasPassword && (
          <Input
            type="password"
            label="Current password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            disabled={isSaving}
            required
          />
        )}
        <Input
          type="password"
          label="New password"
          autoComplete="new-password"
          helperText="At least 8 characters."
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          minLength={8}
          disabled={isSaving}
          required
        />
        <Input
          type="password"
          label="Confirm new password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={8}
          disabled={isSaving}
          required
        />

        <div>
          <Button type="submit" size="sm" disabled={isSaving}>
            {isSaving ? "Saving…" : hasPassword ? "Update password" : "Set password"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
