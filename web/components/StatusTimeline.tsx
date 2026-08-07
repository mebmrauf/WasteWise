import * as React from "react";
import { UserCheck, Truck, MapPin, CheckCircle2, type LucideIcon } from "lucide-react";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

export type PickupTrackingStatus = "ASSIGNED" | "EN_ROUTE" | "ARRIVED" | "COMPLETED";

export interface StatusTimelineProps {
  currentStatus: PickupTrackingStatus;
  className?: string;
}

interface Stage {
  status: PickupTrackingStatus;
  label: string;
  icon: LucideIcon;
}

const STAGES: Stage[] = [
  { status: "ASSIGNED", label: "Assigned", icon: UserCheck },
  { status: "EN_ROUTE", label: "En route", icon: Truck },
  { status: "ARRIVED", label: "Arrived", icon: MapPin },
  { status: "COMPLETED", label: "Completed", icon: CheckCircle2 },
];

type StageState = "completed" | "current" | "upcoming";

const circleClasses: Record<StageState, string> = {
  completed: "border-primary-600 bg-primary-600",
  current: "border-2 border-primary-600 bg-primary-50",
  upcoming: "border border-neutral-300 bg-neutral-0",
};

const iconClasses: Record<StageState, string> = {
  completed: "text-neutral-0",
  current: "text-primary-600",
  upcoming: "text-neutral-400",
};

const labelClasses: Record<StageState, string> = {
  completed: "text-neutral-600",
  current: "text-primary-700",
  upcoming: "text-neutral-500",
};

const connectorClasses: Record<"filled" | "upcoming", string> = {
  filled: "border-primary-600",
  upcoming: "border-neutral-200",
};

const stageStateLabel: Record<StageState, string> = {
  completed: "completed",
  current: "current step",
  upcoming: "upcoming",
};

export function StatusTimeline({ currentStatus, className }: StatusTimelineProps) {
  const currentIndex = STAGES.findIndex((stage) => stage.status === currentStatus);

  return (
    <ol aria-label="Pickup status progress" className={cn("flex w-full items-start", className)}>
      {STAGES.map((stage, index) => {
        const stageState: StageState = index < currentIndex ? "completed" : index === currentIndex ? "current" : "upcoming";
        const isLast = index === STAGES.length - 1;
        const connectorState = index < currentIndex ? "filled" : "upcoming";

        return (
          <li
            key={stage.status}
            aria-current={stageState === "current" ? "step" : undefined}
            className="relative flex flex-1 flex-col items-center gap-2"
          >
            {!isLast && (
              <div
                aria-hidden="true"
                className={cn("absolute left-1/2 top-5 h-0 w-full border-t", connectorClasses[connectorState])}
              />
            )}

            <div
              className={cn(
                "relative z-10 flex h-10 w-10 items-center justify-center rounded-full",
                circleClasses[stageState]
              )}
            >
              <Icon icon={stage.icon} size="md" className={iconClasses[stageState]} aria-hidden />
            </div>

            <p className={cn("text-center text-label", labelClasses[stageState])}>
              {stage.label}
              <span className="sr-only"> — {stageStateLabel[stageState]}</span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}
