import type { Metadata } from "next";
import { ErrorBanner } from "@/components/ErrorBanner";
import { AuthPageShell } from "../_components/AuthPageShell";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Log in — WasteWise",
  description: "Log in to your WasteWise account to manage pickups, offers, and your recycling history.",
  openGraph: {
    title: "Log in — WasteWise",
    description: "Log in to your WasteWise account to manage pickups, offers, and your recycling history.",
    type: "website",
    siteName: "WasteWise",
  },
};

// Messages for the `?error=` codes the OAuth callback redirects back with (api-contract.md §7).
// Only covers codes this page's own redirect target can receive, not every auth error code.
const oauthErrorMessages: Record<string, string> = {
  oauth_state_mismatch: "Your sign-in attempt expired or looked suspicious. Please try again.",
  // In practice Facebook-specific (Google almost always returns an email), but the error code
  // itself is provider-agnostic, so the copy doesn't name one provider.
  oauth_email_required:
    "That account doesn't have a verified email address on file, so we can't create a WasteWise account from it. Please sign up with email instead.",
  oauth_failed: "Something went wrong signing you in. Please try again.",
};

function resolveOAuthErrorMessage(errorParam: string | string[] | undefined): string | null {
  const code = Array.isArray(errorParam) ? errorParam[0] : errorParam;
  if (!code) return null;
  return oauthErrorMessages[code] ?? "Something went wrong signing you in. Please try again.";
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string | string[] };
}) {
  const errorMessage = resolveOAuthErrorMessage(searchParams.error);

  return (
    <AuthPageShell
      title="Log in"
      subtitle="Welcome back — pick up where you left off."
      banner={errorMessage && <ErrorBanner className="mt-4">{errorMessage}</ErrorBanner>}
      footerNote={
        <>
          Don&apos;t have an account?{" "}
          <a href="/signup" className="text-primary-600 hover:text-primary-700">
            Sign up
          </a>
        </>
      }
    >
      <LoginForm />
    </AuthPageShell>
  );
}
