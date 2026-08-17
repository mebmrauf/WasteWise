import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, XCircle, Info, Circle } from "lucide-react";

type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

const toneClasses: Record<StatusTone, string> = {
  success: "border-success-500 bg-success-50 text-success-700",
  warning: "border-warning-500 bg-warning-50 text-warning-700",
  error: "border-error-500 bg-error-50 text-error-700",
  info: "border-info-500 bg-info-50 text-info-700",
  neutral: "border-neutral-200 bg-neutral-50 text-neutral-700",
};

const ToneIcons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
  neutral: Info,
};

export interface StatusPillProps {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}

export function StatusPill({ tone, children, className }: StatusPillProps) {
  const IconComponent = ToneIcons[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-label",
        toneClasses[tone],
        className
      )}
    >
      <IconComponent size={14} className="shrink-0" />
      {children}
    </span>
  );
}
