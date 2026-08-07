import { Button } from "@/components/Button";
import { getGoogleOAuthUrl, getFacebookOAuthUrl } from "@/lib/api/auth";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20.4H24v7.2h11.3c-1.6 4.6-6 7.9-11.3 7.9-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.1-5.1C33.6 6 29 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 5.9 4.3C13.8 15.5 18.5 12 24 12c3.1 0 5.9 1.2 8 3.1l5.1-5.1C33.6 6 29 4 24 4c-7.3 0-13.6 4.1-16.7 10.1z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c4.9 0 9.4-1.9 12.8-4.9l-5.9-5c-2 1.5-4.6 2.4-7.4 2.4-5.3 0-9.7-3.4-11.3-8l-5.9 4.6C9.5 39.9 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20.4H24v7.2h11.3c-.8 2.2-2.2 4.1-4 5.5l5.9 5C40.7 34.9 44 30 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z"
      />
      <path
        fill="#FFFFFF"
        d="M16.34 15.56 16.87 12.07h-3.32V9.81c0-.96.46-1.89 1.95-1.89h1.51V4.95s-1.37-.24-2.68-.24c-2.74 0-4.53 1.68-4.53 4.7v2.66H7.08v3.49h3.05V24a12.1 12.1 0 0 0 3.77 0v-8.44h2.44z"
      />
    </svg>
  );
}

export function OAuthButtons() {
  return (
    <div className="flex flex-col gap-3">
      <Button
        href={getGoogleOAuthUrl()}
        variant="secondary"
        fullWidth
        className="gap-2"
      >
        <GoogleIcon />
        Continue with Google
      </Button>
      <Button
        href={getFacebookOAuthUrl()}
        variant="secondary"
        fullWidth
        className="gap-2"
      >
        <FacebookIcon />
        Continue with Facebook
      </Button>
    </div>
  );
}
