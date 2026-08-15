"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

export interface FilterPillSelectOption {
  value: string;
  label: string;
}

export interface FilterPillSelectProps {
  label: string;
  value: string;
  options: FilterPillSelectOption[];
  onChange: (value: string) => void;
  active?: boolean;
  "aria-label"?: string;
  className?: string;
}

export function FilterPillSelect({
  label,
  value,
  options,
  onChange,
  active = false,
  "aria-label": ariaLabel,
  className,
}: FilterPillSelectProps) {
  const generatedId = React.useId();
  const listboxId = `${generatedId}-listbox`;

  const [isOpen, setIsOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const blurTimeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (blurTimeoutRef.current !== null) window.clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  function clearPendingBlur() {
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  }

  function open() {
    clearPendingBlur();
    setHighlightedIndex(options.findIndex((option) => option.value === value));
    setIsOpen(true);
  }

  function scheduleClose() {
    blurTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setHighlightedIndex(-1);
      blurTimeoutRef.current = null;
    }, 120);
  }

  function select(option: FilterPillSelectOption) {
    clearPendingBlur();
    onChange(option.value);
    setIsOpen(false);
    setHighlightedIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) return open();
      setHighlightedIndex((previous) => (previous + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) return open();
      setHighlightedIndex((previous) => (previous <= 0 ? options.length - 1 : previous - 1));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isOpen && highlightedIndex >= 0) {
        select(options[highlightedIndex]);
      } else {
        open();
      }
    } else if (event.key === "Escape") {
      if (isOpen) {
        event.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        aria-label={ariaLabel ?? label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onBlur={scheduleClose}
        onKeyDown={handleKeyDown}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border py-2 pl-4 pr-3 text-body-sm transition-colors",
          "focus:outline-none focus-visible:shadow-focus",
          active
            ? "border-primary-500 bg-primary-50 text-primary-700"
            : "border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300"
        )}
      >
        <span className="flex items-center">
          <span className={cn("whitespace-nowrap mr-1", active ? "text-primary-600" : "text-neutral-500")}>{label}</span>
          <span className="whitespace-nowrap font-semibold">{selectedOption?.label}</span>
        </span>
        <Icon icon={ChevronDown} size="sm" className={active ? "text-primary-500" : "text-neutral-400"} />
      </button>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel ?? label}
          className="absolute left-0 top-full z-20 mt-1 max-h-64 min-w-full overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-0 py-1 shadow-md"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlightedIndex;
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(option);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  "cursor-pointer whitespace-nowrap px-3 py-2 text-body-sm text-neutral-900",
                  isHighlighted ? "bg-primary-50 text-primary-700" : "hover:bg-neutral-50",
                  isSelected && "font-semibold"
                )}
              >
                {option.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
