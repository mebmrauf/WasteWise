import * as React from "react";
import { Recycle, Newspaper, Leaf, GlassWater, Magnet, Cpu, type LucideIcon } from "lucide-react";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

export type WasteCategory = "PLASTIC" | "PAPER" | "ORGANIC" | "GLASS" | "METAL" | "ELECTRONIC";

export interface WasteCategoryMeta {
  value: WasteCategory;
  label: string;
  hint: string;
  icon: LucideIcon;
}

export const WASTE_CATEGORIES: WasteCategoryMeta[] = [
  { value: "PLASTIC", label: "Plastic", hint: "Bottles, containers", icon: Recycle },
  { value: "PAPER", label: "Paper", hint: "Cardboard, newsprint", icon: Newspaper },
  { value: "ORGANIC", label: "Organic", hint: "Food, garden waste", icon: Leaf },
  { value: "GLASS", label: "Glass", hint: "Bottles, jars", icon: GlassWater },
  { value: "METAL", label: "Metal", hint: "Cans, scrap", icon: Magnet },
  { value: "ELECTRONIC", label: "E-waste", hint: "Cables, devices", icon: Cpu },
];

export interface WasteCategorySelectorProps {
  value: WasteCategory[];
  onChange: (value: WasteCategory[]) => void;
  "aria-label"?: string;
  className?: string;
}

export function WasteCategorySelector({
  value,
  onChange,
  "aria-label": ariaLabel = "Waste categories",
  className,
}: WasteCategorySelectorProps) {
  function toggle(category: WasteCategory) {
    if (value.includes(category)) {
      onChange(value.filter((selected) => selected !== category));
    } else {
      onChange([...value, category]);
    }
  }

  return (
    <div role="group" aria-label={ariaLabel} className={cn("grid grid-cols-2 gap-3 md:grid-cols-3", className)}>
      {WASTE_CATEGORIES.map((category) => {
        const isSelected = value.includes(category.value);
        return (
          <button
            key={category.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => toggle(category.value)}
            className={cn(
              "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors",
              "focus-visible:outline-none focus-visible:shadow-focus",
              isSelected
                ? "border-primary-500 bg-primary-50"
                : "border-neutral-200 bg-neutral-0 hover:border-neutral-300"
            )}
          >
            <Icon icon={category.icon} size="lg" className={isSelected ? "text-primary-700" : "text-neutral-700"} />
            <span className="flex flex-col gap-1">
              <span className={cn("text-h4", isSelected ? "text-primary-700" : "text-neutral-900")}>
                {category.label}
              </span>
              <span className={cn("text-body-sm", isSelected ? "text-primary-700" : "text-neutral-500")}>
                {category.hint}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
