"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/Input";

export interface AddressSuggestion {
  placeId: string;
  description: string;
}

export interface AddressAutocompleteProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: AddressSuggestion[];
  onSelectSuggestion: (suggestion: AddressSuggestion) => void;
  isLoading?: boolean;
  error?: string | null;
  disabled?: boolean;
  placeholder?: string;
  name?: string;
  id?: string;
  noResultsText?: string;
  className?: string;
}

export function AddressAutocomplete({
  label,
  value,
  onChange,
  suggestions,
  onSelectSuggestion,
  isLoading = false,
  error = null,
  disabled = false,
  placeholder,
  name,
  id,
  noResultsText = "No matches found.",
  className,
}: AddressAutocompleteProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const listboxId = `${inputId}-listbox`;

  const [isOpen, setIsOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const blurTimeoutRef = React.useRef<number | null>(null);

  const suggestionsKey = suggestions.map((suggestion) => suggestion.placeId).join("|");
  React.useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestionsKey]);

  React.useEffect(() => {
    return () => {
      if (blurTimeoutRef.current !== null) window.clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const trimmedValue = value.trim();
  const showEmptyState = !isLoading && trimmedValue.length > 0 && suggestions.length === 0;
  const shouldShowPanel = isOpen && !disabled && (suggestions.length > 0 || isLoading || showEmptyState);
  const activeOptionId = highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined;

  function clearPendingBlur() {
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  }

  function handleFocus() {
    clearPendingBlur();
    setIsOpen(true);
  }

  function handleBlur() {
    blurTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setHighlightedIndex(-1);
      blurTimeoutRef.current = null;
    }, 120);
  }

  function handleSelect(suggestion: AddressSuggestion) {
    clearPendingBlur();
    onSelectSuggestion(suggestion);
    setIsOpen(false);
    setHighlightedIndex(-1);
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
    setIsOpen(true);
    setHighlightedIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      if (suggestions.length === 0) return;
      setHighlightedIndex((previous) => (previous + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      if (suggestions.length === 0) return;
      setHighlightedIndex((previous) => (previous <= 0 ? suggestions.length - 1 : previous - 1));
    } else if (event.key === "Enter") {
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        event.preventDefault();
        handleSelect(suggestions[highlightedIndex]);
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
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="relative">
        <Input
          id={inputId}
          name={name}
          label={label}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          errorText={error ?? undefined}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={shouldShowPanel}
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />

        {shouldShowPanel && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-0 shadow-md">
            {isLoading && (
              <p className="px-3 py-2 text-body-sm text-neutral-500" aria-live="polite">
                Searching…
              </p>
            )}

            {showEmptyState && <p className="px-3 py-2 text-body-sm text-neutral-500">{noResultsText}</p>}

            <ul
              id={listboxId}
              role="listbox"
              aria-label="Address suggestions"
              className={cn("max-h-64 overflow-y-auto", suggestions.length > 0 && "py-1")}
            >
              {suggestions.map((suggestion, index) => {
                const isHighlighted = index === highlightedIndex;
                return (
                  <li
                    key={suggestion.placeId}
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={isHighlighted}
                    onClick={() => handleSelect(suggestion)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      "cursor-pointer px-3 py-2 text-body-sm text-neutral-900",
                      isHighlighted ? "bg-primary-50 text-primary-700" : "hover:bg-neutral-50"
                    )}
                  >
                    {suggestion.description}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* One-time live-region announcement; Input already renders the visible error below the field. */}
      {error && (
        <span role="alert" className="sr-only">
          {error}
        </span>
      )}
    </div>
  );
}
