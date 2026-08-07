import * as React from "react";
import { Check } from "lucide-react";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

export interface StepProgressProps {
  steps: string[];
  currentIndex: number;
  "aria-label"?: string;
  className?: string;
}

type StepState = "completed" | "current" | "upcoming";

const circleClasses: Record<StepState, string> = {
  completed: "border-primary-600 bg-primary-600",
  current: "border-2 border-primary-600 bg-primary-50",
  upcoming: "border border-neutral-300 bg-neutral-0",
};

const numberClasses: Record<StepState, string> = {
  completed: "text-neutral-0",
  current: "text-primary-600",
  upcoming: "text-neutral-500",
};

const labelClasses: Record<StepState, string> = {
  completed: "text-neutral-600",
  current: "text-primary-700",
  upcoming: "text-neutral-500",
};

const connectorClasses: Record<"filled" | "upcoming", string> = {
  filled: "border-primary-600",
  upcoming: "border-neutral-200",
};

const stepStateAnnouncement: Record<StepState, string> = {
  completed: "completed",
  current: "current step",
  upcoming: "upcoming",
};

export function StepProgress({ steps, currentIndex, "aria-label": ariaLabel = "Progress", className }: StepProgressProps) {
  return (
    <ol aria-label={ariaLabel} className={cn("flex w-full items-center", className)}>
      {steps.map((label, index) => {
        const state: StepState = index < currentIndex ? "completed" : index === currentIndex ? "current" : "upcoming";
        const isLast = index === steps.length - 1;
        const connectorState = index < currentIndex ? "filled" : "upcoming";

        return (
          <li
            key={label}
            aria-current={state === "current" ? "step" : undefined}
            className={cn("flex items-center gap-2", !isLast && "flex-1")}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-label",
                circleClasses[state]
              )}
            >
              {state === "completed" ? (
                <Icon icon={Check} size="sm" className={numberClasses[state]} aria-hidden />
              ) : (
                <span className={numberClasses[state]}>{index + 1}</span>
              )}
            </span>

            <span className={cn("whitespace-nowrap text-body-sm", labelClasses[state])}>
              {label}
              <span className="sr-only"> — {stepStateAnnouncement[state]}</span>
            </span>

            {!isLast && (
              <span aria-hidden="true" className={cn("h-0 flex-1 border-t", connectorClasses[connectorState])} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
