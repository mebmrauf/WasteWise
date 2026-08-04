import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { NavBar } from "@/components/NavBar";
import { PageContainer } from "@/components/PageContainer";

// Site-wide 404. Role-specific route groups get their own error.tsx/not-found.tsx as they ship.
export default function NotFound() {
  return (
    <>
      <NavBar brand={<span className="font-heading text-h4 text-neutral-900">WasteWise</span>} />
      <PageContainer as="main" className="flex min-h-[60vh] items-center justify-center py-16">
        <Card className="max-w-md text-center">
          <p className="font-heading text-overline text-primary-600">404</p>
          <h1 className="mt-2 text-h2 text-neutral-900">Page not found</h1>
          <p className="mt-3 text-body-sm text-neutral-500">
            The page you&apos;re looking for doesn&apos;t exist, moved, or hasn&apos;t been built
            yet — WasteWise is still rolling out role by role.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button href="/">Back to homepage</Button>
          </div>
        </Card>
      </PageContainer>
    </>
  );
}
