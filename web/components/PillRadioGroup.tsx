import * as React from "react";
import { cn } from "@/lib/utils";

export interface PillRadioOption {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface PillRadioGroupProps {
  options: PillRadioOption[];
  value?: string | null;
  onChange: (id: string) => void;
  "aria-label": string;
  className?: string;
  layout?: "wrap" | "stacked";
}

export function PillRadioGroup({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
  className,
  layout = "wrap",
}: PillRadioGroupProps) {
  const enabledIndexes = options.reduce<number[]>((acc, option, index) => {
    if (!option.disabled) acc.push(index);
    return acc;
  }, []);

  const selectedIndex = options.findIndex((option) => option.id === value && !option.disabled);
  const tabbableIndex = selectedIndex >= 0 ? selectedIndex : enabledIndexes[0];

  function focusOption(index: number) {
    const button = document.getElementById(optionElementId(ariaLabel, options[index].id));
    button?.focus();
  }

  function moveTo(fromIndex: number, direction: 1 | -1) {
    if (enabledIndexes.length === 0) return;
    const position = enabledIndexes.indexOf(fromIndex);
    const basePosition = position === -1 ? 0 : position;
    const nextPosition = (basePosition + direction + enabledIndexes.length) % enabledIndexes.length;
    const nextIndex = enabledIndexes[nextPosition];
    onChange(options[nextIndex].id);
    focusOption(nextIndex);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        moveTo(index, 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        moveTo(index, -1);
        break;
      case "Home":
        if (enabledIndexes.length > 0) {
          event.preventDefault();
          onChange(options[enabledIndexes[0]].id);
          focusOption(enabledIndexes[0]);
        }
        break;
      case "End":
        if (enabledIndexes.length > 0) {
          event.preventDefault();
          const lastIndex = enabledIndexes[enabledIndexes.length - 1];
          onChange(options[lastIndex].id);
          focusOption(lastIndex);
        }
        break;
      default:
        break;
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "flex gap-2",
        layout === "wrap" ? "flex-wrap" : "flex-col items-stretch w-fit",
        className
      )}
    >
      {options.map((option, index) => {
        const isSelected = option.id === value;
        return (
          <button
            key={option.id}
            id={optionElementId(ariaLabel, option.id)}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={option.disabled}
            tabIndex={index === tabbableIndex ? 0 : -1}
            onClick={() => onChange(option.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "rounded-full border px-5 py-3 text-label-lg transition-all font-medium",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
              option.disabled
                ? "cursor-not-allowed border-neutral-100 bg-neutral-50 text-neutral-400"
                : isSelected
                ? "border-primary-500 bg-primary-500 text-white shadow-md scale-[1.02]"
                : "border-neutral-200 bg-white text-neutral-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700",
              layout === "stacked" && "w-full text-center"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function optionElementId(groupLabel: string, optionId: string): string {
  return `pill-radio-${groupLabel.replace(/\s+/g, "-").toLowerCase()}-${optionId}`;
}
