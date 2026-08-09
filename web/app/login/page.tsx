import { ErrorBanner } from "@/components/ErrorBanner";
import { AuthPageShell } from "../_components/AuthPageShell";
import { LoginForm } from "./LoginForm";



const oauthErrorMessages: Record<string, string> = {
  oauth_state_mismatch: "Your sign-in attempt expired or looked suspicious. Please try again.",
  oauth_email_required:
    "That account doesn't have a verified email address on file, so we can't create a WasteWise account from it. Please sign up with email instead.",
  oauth_failed: "Something went wrong signing you in. Please try again.",
};

function resolveOAuthErrorMessage(errorParam: string | string[] | undefined): string | null {
  const code = Array.isArray(errorParam) ? errorParam[0] : errorParam;
  if (!code) return null;
  return oauthErrorMessages[code] ?? "Something went wrong signing you in. Please try again.";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const searchParamsValue = await searchParams;
  const errorMessage = resolveOAuthErrorMessage(searchParamsValue.error);

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
