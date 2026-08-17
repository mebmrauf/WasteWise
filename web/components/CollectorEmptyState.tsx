import * as React from "react";
import { Card } from "@/components/Card";
import { Icon } from "@/components/Icon";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type CollectorEmptyStateTone = "primary" | "amber";

const toneClasses: Record<CollectorEmptyStateTone, string> = {
  primary: "bg-primary-100 text-primary-600",
  amber: "bg-amber-100 text-amber-600",
};

export interface CollectorEmptyStateProps {
  icon: LucideIcon;
  tone?: CollectorEmptyStateTone;
  title: string;
  description: string;
  children?: React.ReactNode;
  className?: string;
}

/** Shared icon-circle + title + description + CTA shape for the collector jobs/active/route pages' empty and blocking states. */
export function CollectorEmptyState({
  icon,
  tone = "primary",
  title,
  description,
  children,
  className,
}: CollectorEmptyStateProps) {
  return (
    <Card className={cn("glass-panel mt-8 flex flex-col items-center gap-4 py-16 text-center shadow-lg border-0 rounded-2xl", className)}>
      <div className={cn("inline-flex h-20 w-20 items-center justify-center rounded-full", toneClasses[tone])}>
        <Icon icon={icon} size="lg" aria-hidden />
      </div>
      <div>
        <p className="font-heading text-h3 text-neutral-900">{title}</p>
        <p className="mt-2 text-body-lg text-neutral-500 max-w-sm mx-auto">{description}</p>
      </div>
      {children && <div className="flex flex-wrap justify-center gap-3 mt-4">{children}</div>}
    </Card>
  );
}
