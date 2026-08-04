import { Card } from "@/components/Card";
import { PageContainer } from "@/components/PageContainer";

// Route-group loading fallback for app/(user)/. Renders inside layout.tsx, so the NavBar
// stays visible — this only needs the body content. Plain text, not a spinner: no dedicated
// Spinner/Skeleton component exists yet (see NavAuthActions.tsx's isLoading branch).
export default function UserRouteLoading() {
  return (
    <PageContainer className="flex min-h-[60vh] items-center justify-center py-16">
      <Card className="w-full max-w-md text-center">
        <p className="text-body-sm text-neutral-500">Loading…</p>
      </Card>
    </PageContainer>
  );
}
