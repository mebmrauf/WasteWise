import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/Card";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

export interface DashboardFeatureTileProps {
  icon: LucideIcon;
  label: string;
  description: string;
  href?: string;
  interactive?: boolean;
  badge?: React.ReactNode;
  iconContainerClassName?: string;
  iconClassName?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  className?: string;
}

export function DashboardFeatureTile({
  icon,
  label,
  description,
  href,
  interactive,
  badge,
  iconContainerClassName,
  iconClassName,
  labelClassName,
  descriptionClassName,
  className,
}: DashboardFeatureTileProps) {
  const isInteractive = interactive ?? Boolean(href);

  const content = (
    <Card interactive={isInteractive} className={cn("flex flex-col items-start gap-3 h-full", className)}>
      <div className={cn("flex items-center justify-center h-12 w-12 shrink-0 rounded-full", iconContainerClassName)}>
        <Icon icon={icon} size="lg" className={iconClassName} />
      </div>
      <div className="flex flex-col gap-1">
        {}
        <h2 className={cn("text-h4", labelClassName)}>{label}</h2>
        <p className={cn("text-body-sm", descriptionClassName)}>{description}</p>
      </div>
      {badge}
    </Card>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block h-full focus-visible:outline-none focus-visible:shadow-focus"
      >
        {content}
      </Link>
    );
  }

  return content;
}
