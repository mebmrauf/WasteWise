import * as React from "react";
import { PillRadioGroup } from "@/components/PillRadioGroup";

export interface TimeSlot {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface TimeSlotPickerProps {
  slots: TimeSlot[];
  value?: string | null;
  onChange: (id: string) => void;
  "aria-label"?: string;
  className?: string;
}

export function TimeSlotPicker({
  slots,
  value,
  onChange,
  "aria-label": ariaLabel = "Time slot",
  className,
}: TimeSlotPickerProps) {
  return (
    <PillRadioGroup options={slots} value={value} onChange={onChange} aria-label={ariaLabel} className={className} />
  );
}
