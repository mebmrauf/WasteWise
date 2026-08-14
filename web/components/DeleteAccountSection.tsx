"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Icon } from "@/components/Icon";
import { Input } from "@/components/Input";
import { useAuth } from "@/lib/auth/AuthContext";
import { AuthApiError } from "@/lib/api/auth";
import { deleteMyAccount } from "@/lib/api/users";

const deleteAccountErrorMessages: Record<string, string> = {
  PASSWORD_REQUIRED: "Enter your password to confirm.",
  INVALID_PASSWORD: "That password is incorrect.",
};

export interface DeleteAccountSectionProps {
  hasPassword: boolean;
}

export function DeleteAccountSection({ hasPassword }: DeleteAccountSectionProps) {
  const { refetchUser } = useAuth();
  const router = useRouter();

  const [isConfirming, setIsConfirming] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function handleOpen() {
    setIsConfirming(true);
    setPassword("");
    setError(null);
  }

  function handleCancel() {
    setIsConfirming(false);
    setPassword("");
    setError(null);
  }

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteMyAccount(hasPassword ? { password } : {});
      await refetchUser();
      router.replace("/");
    } catch (err) {
      setIsDeleting(false);
      if (err instanceof AuthApiError) {
        setError(deleteAccountErrorMessages[err.code] ?? err.message);
      } else {
        setError("Couldn't delete your account. Try again.");
      }
    }
  }

  return (
    <Card className="mt-8 p-6 md:p-8 bg-white rounded-2xl shadow-sm border border-error-200 transition-all">
      <h3 className="text-xl font-bold text-error-700 mb-2 flex items-center gap-2">
        <Icon icon={Trash2} size="sm" className="text-error-600" /> Danger Zone
      </h3>
      <p className="text-body-sm text-neutral-600 mb-6 max-w-form">
        Deleting your account is permanent. Your personal details, address, avatar, and saved
        preferences are removed and you won&apos;t be able to sign in again. Records shared with
        other people (past pickups, offers, ratings, marketplace requests) stay on their end but
        will show you as a deleted user.
      </p>

<<<<<<< Updated upstream
=======
      <div className="mb-8 flex flex-col gap-3">
        <div className="flex items-start gap-3 text-sm text-neutral-700 bg-white/50 p-3 rounded-lg border border-rose-100/50">
          <Icon icon={X} size="sm" className="mt-1 shrink-0 text-rose-500" />
          <span>Your login access, password, and saved preferences</span>
        </div>
        <div className="flex items-start gap-3 text-sm text-neutral-700 bg-white/50 p-3 rounded-lg border border-rose-100/50">
          <Icon icon={X} size="sm" className="mt-1 shrink-0 text-rose-500" />
          <span>Personal details, address, and profile photo</span>
        </div>
        <div className="flex items-start gap-3 text-sm text-neutral-700 bg-white/50 p-3 rounded-lg border border-rose-100/50">
          <Icon icon={Check} size="sm" className="mt-1 shrink-0 text-emerald-600" />
          <span>
            Records shared with others (past pickups, offers, ratings, marketplace requests) stay
            on their end, but show you as a deleted user.
          </span>
        </div>
      </div>

>>>>>>> Stashed changes
      {!isConfirming ? (
        <Button variant="destructive" onClick={handleOpen}>
          Delete my account
        </Button>
      ) : (
        <div className="flex flex-col gap-4 max-w-sm">
          {hasPassword && (
            <Input
              type="password"
              label="Confirm your password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              disabled={isDeleting}
            />
          )}
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              disabled={isDeleting || (hasPassword && password.trim().length === 0)}
              onClick={() => void handleDelete()}
            >
              {isDeleting ? "Deleting…" : "Permanently delete my account"}
            </Button>
            <Button variant="ghost" disabled={isDeleting} onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
