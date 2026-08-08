import * as React from "react";
import { cn } from "@/lib/utils";

type StatusTone = "success" | "warning" | "error" | "info";

const toneClasses: Record<StatusTone, string> = {
  success: "border-success-500 bg-success-50 text-success-700",
  warning: "border-warning-500 bg-warning-50 text-warning-700",
  error: "border-error-500 bg-error-50 text-error-700",
  info: "border-info-500 bg-info-50 text-info-700",
};

export interface StatusPillProps {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}

export function StatusPill({ tone, children, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-label",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
