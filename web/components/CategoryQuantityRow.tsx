import * as React from "react";
import { WasteCategoryChip } from "@/components/WasteCategoryChip";
import type { WasteCategory } from "@/components/WasteCategorySelector";
import { cn } from "@/lib/utils";

export interface CategoryQuantityRowProps {
  category: WasteCategory;
  quantityLabel?: string | null;
  placeholder?: string;
  className?: string;
}

export function CategoryQuantityRow({
  category,
  quantityLabel,
  placeholder = "Not selected yet",
  className,
}: CategoryQuantityRowProps) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2", className)}>
      <WasteCategoryChip category={category} />
      <span className="text-body-sm text-neutral-700">{quantityLabel ?? placeholder}</span>
    </div>
  );
}
