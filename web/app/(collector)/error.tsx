"use client";

import * as React from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageContainer } from "@/components/PageContainer";

export default function CollectorRouteError({
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
