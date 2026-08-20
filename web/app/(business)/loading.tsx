import { Card } from "@/components/Card";
import { PageContainer } from "@/components/PageContainer";

export default function UserRouteLoading() {
  return (
    <PageContainer className="flex min-h-[60vh] items-center justify-center py-16">
      <Card className="w-full max-w-md text-center">
        <p className="text-body-sm text-neutral-500">Loading…</p>
      </Card>
    </PageContainer>
  );
}
