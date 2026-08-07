import * as React from "react";
import { Card } from "@/components/Card";
import { PageContainer } from "@/components/PageContainer";
import { OAuthButtons } from "./OAuthButtons";
import { OrDivider } from "./OrDivider";

export interface AuthPageShellProps {
  title: string;
  subtitle: string;
  banner?: React.ReactNode;
  children: React.ReactNode;
  footerNote: React.ReactNode;
}

export function AuthPageShell({ title, subtitle, banner, children, footerNote }: AuthPageShellProps) {
  return (
    <PageContainer as="main" className="flex min-h-screen items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <a href="/" className="font-heading text-h4 text-neutral-900">
            WasteWise
          </a>
        </div>

        <Card>
          <h1 className="text-h3 text-neutral-900">{title}</h1>
          <p className="mt-1 text-body-sm text-neutral-500">{subtitle}</p>

          {banner}

          <div className="mt-6">
            <OAuthButtons />
          </div>

          <OrDivider />

          {children}

          <p className="mt-6 text-center text-body-sm text-neutral-500">{footerNote}</p>
        </Card>
      </div>
    </PageContainer>
  );
}
