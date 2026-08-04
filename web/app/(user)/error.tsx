"use client";

import * as React from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageContainer } from "@/components/PageContainer";

// Route-group error boundary for app/(user)/. Renders inside layout.tsx, so the NavBar there
// keeps rendering around it. Must be a Client Component accepting exactly `{ error, reset }` —
// that's the Next.js App Router error.tsx contract.
//
// SECURITY: never render the raw `error.message`. This boundary also catches client-thrown
// errors (not just server-render failures, which Next.js already redacts in production), and
// a raw error can leak internal variable/property names. The banner always shows a generic
// message; the real error only goes to console.error in dev.
export default function UserRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <PageContainer className="flex min-h-[60vh] items-center justify-center py-16">
      <Card className="w-full max-w-md text-center">
        <h1 className="text-h2 text-neutral-900">Something went wrong</h1>
        <p className="mt-3 text-body-sm text-neutral-500">
          We couldn&apos;t load this page. Try again, or head back home.
        </p>
        <ErrorBanner className="mt-4 text-left">
          Something went wrong. Please try again.
        </ErrorBanner>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Button variant="secondary" href="/">
            Back to homepage
          </Button>
        </div>
      </Card>
    </PageContainer>
  );
}
