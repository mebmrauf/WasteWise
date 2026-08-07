import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { DashboardFeatureTile } from "@/components/DashboardFeatureTile";
import { cn } from "@/lib/utils";

export interface ComingSoonCardProps {
  icon: LucideIcon;
  label: string;
  description: string;
  badgeLabel?: string;
  className?: string;
}

export function ComingSoonCard({ icon, label, description, badgeLabel = "Coming soon", className }: ComingSoonCardProps) {
  return (
    <DashboardFeatureTile
      icon={icon}
      label={label}
      description={description}
      iconClassName="text-neutral-400"
      labelClassName="text-neutral-600"
      descriptionClassName="text-neutral-500"
      className={cn("bg-neutral-50", className)}
      badge={
        <span className="rounded-full border border-neutral-300 px-3 py-1 text-label text-neutral-800">
          {badgeLabel}
        </span>
      }
    />
  );
}
