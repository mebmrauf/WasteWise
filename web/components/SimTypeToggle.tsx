import * as React from "react";
import { PillRadioGroup, type PillRadioOption } from "@/components/PillRadioGroup";

export type SimType = "PREPAID" | "POSTPAID";

const SIM_TYPE_OPTIONS: PillRadioOption[] = [
  { id: "PREPAID", label: "Prepaid" },
  { id: "POSTPAID", label: "Postpaid" },
];

export interface SimTypeToggleProps {
  value?: SimType | null;
  onChange: (simType: SimType) => void;
  "aria-label"?: string;
  className?: string;
}

export function SimTypeToggle({
  value,
  onChange,
  "aria-label": ariaLabel = "SIM type",
  className,
}: SimTypeToggleProps) {
  return (
    <PillRadioGroup
      options={SIM_TYPE_OPTIONS}
      value={value}
      onChange={(id) => onChange(id as SimType)}
      aria-label={ariaLabel}
      className={className}
    />
  );
}
