import * as React from "react";
import { Icon } from "@/components/Icon";
import { Select, type SelectOption } from "@/components/Select";
import { WASTE_CATEGORIES, type WasteCategory } from "@/components/WasteCategorySelector";
import { cn } from "@/lib/utils";

type LoadSize = "SMALL" | "MEDIUM" | "LARGE" | "EXTRA_LARGE";

export interface WasteCategoryQuantityPickerProps {
  categories: WasteCategory[];
  value: Partial<Record<WasteCategory, LoadSize>>;
  loadSizeOptions: SelectOption[];
  onChange: (category: WasteCategory, loadSize: LoadSize) => void;
  className?: string;
}

export function WasteCategoryQuantityPicker({
  categories,
  value,
  loadSizeOptions,
  onChange,
  className,
}: WasteCategoryQuantityPickerProps) {
  return (
    <div className={cn("grid grid-cols-[auto_1fr] items-center gap-4", className)}>
      {categories.map((category) => {
        const meta = WASTE_CATEGORIES.find((candidate) => candidate.value === category);
        if (!meta) return null;

        return (
          <React.Fragment key={category}>
            <div className="flex items-center gap-2">
              <Icon icon={meta.icon} size="md" className="text-neutral-700" />
              <span className="text-label text-neutral-800">{meta.label}</span>
            </div>
            <Select
              aria-label={`${meta.label} quantity`}
              value={value[category] ?? ""}
              onChange={(event) => onChange(category, event.target.value as LoadSize)}
              options={loadSizeOptions}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
}
