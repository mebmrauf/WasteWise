import * as React from "react";
import { PillRadioGroup, type PillRadioOption } from "@/components/PillRadioGroup";

export type MobileOperator = "GRAMEENPHONE" | "BANGLALINK" | "ROBI" | "AIRTEL" | "TELETALK";

export const MOBILE_OPERATOR_LABELS: Record<MobileOperator, string> = {
  GRAMEENPHONE: "Grameenphone",
  BANGLALINK: "Banglalink",
  ROBI: "Robi",
  AIRTEL: "Airtel",
  TELETALK: "Teletalk",
};

const OPERATOR_OPTIONS: PillRadioOption[] = (
  Object.keys(MOBILE_OPERATOR_LABELS) as MobileOperator[]
).map((operator) => ({ id: operator, label: MOBILE_OPERATOR_LABELS[operator] }));

export interface OperatorSelectorProps {
  value?: MobileOperator | null;
  onChange: (operator: MobileOperator) => void;
  "aria-label"?: string;
  className?: string;
}

export function OperatorSelector({
  value,
  onChange,
  "aria-label": ariaLabel = "Mobile operator",
  className,
}: OperatorSelectorProps) {
  return (
    <PillRadioGroup
      options={OPERATOR_OPTIONS}
      value={value}
      onChange={(id) => onChange(id as MobileOperator)}
      aria-label={ariaLabel}
      className={className}
    />
  );
}
