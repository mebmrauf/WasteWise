import * as React from "react";
import { WASTE_CATEGORIES, type WasteCategory } from "@/components/WasteCategorySelector";
import { cn } from "@/lib/utils";

const categoryChipClasses: Record<WasteCategory, string> = {
  PLASTIC: "bg-category-plastic-bg text-category-plastic-text border-category-plastic-text",
  PAPER: "bg-category-paper-bg text-category-paper-text border-category-paper-text",
  ORGANIC: "bg-category-organic-bg text-category-organic-text border-category-organic-text",
  GLASS: "bg-category-glass-bg text-category-glass-text border-category-glass-text",
  METAL: "bg-category-metal-bg text-category-metal-text border-category-metal-text",
  ELECTRONIC: "bg-category-ewaste-bg text-category-ewaste-text border-category-ewaste-text",
};

export interface WasteCategoryChipProps {
  category: WasteCategory;
  className?: string;
}

export function WasteCategoryChip({ category, className }: WasteCategoryChipProps) {
  const label = WASTE_CATEGORIES.find((meta) => meta.value === category)?.label ?? category;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-label",
        categoryChipClasses[category],
        className
      )}
    >
      {label}
    </span>
  );
}
