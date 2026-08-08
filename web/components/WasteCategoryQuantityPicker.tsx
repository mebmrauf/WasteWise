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
    <div className={cn("flex flex-col gap-3", className)}>
      {categories.length === 0 && (
        <div className="text-body-sm text-neutral-400 italic px-2 py-4 bg-neutral-50 rounded-xl border border-dashed border-neutral-200 text-center">
          Please select at least one category first.
        </div>
      )}
      {categories.map((category) => {
        const meta = WASTE_CATEGORIES.find((candidate) => candidate.value === category);
        if (!meta) return null;

        return (
          <div key={category} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-neutral-50/50 border border-neutral-100 rounded-xl p-4 transition-colors hover:bg-neutral-50">
            <div className="flex items-center gap-3 sm:min-w-[160px]">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm text-primary-600">
                <Icon icon={meta.icon} size="sm" />
              </div>
              <span className="font-heading text-body font-semibold text-neutral-900">{meta.label}</span>
            </div>
            <div className="flex-1 w-full">
              <Select
                aria-label={`${meta.label} quantity`}
                value={value[category] ?? ""}
                onChange={(event) => onChange(category, event.target.value as LoadSize)}
                options={loadSizeOptions}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
