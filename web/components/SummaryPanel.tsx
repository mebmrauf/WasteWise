import * as React from "react";
import { Card } from "@/components/Card";
import { cn } from "@/lib/utils";

export interface SummaryPanelProps {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function SummaryPanel({ title, children, footer, className }: SummaryPanelProps) {
  return (
    <Card className={cn("flex flex-col gap-4", className)}>
      <h3 className="text-h3 text-neutral-900">{title}</h3>
      <div className="flex flex-col gap-3">{children}</div>
      {footer && <div className="flex flex-col gap-3 border-t border-neutral-200 pt-4">{footer}</div>}
    </Card>
  );
}

export interface SummaryRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export function SummaryRow({ label, value, className }: SummaryRowProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <span className="text-body-sm text-neutral-500">{label}</span>
      <span className="text-body-sm font-medium text-neutral-900">{value}</span>
    </div>
  );
}
