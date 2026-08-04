"use client";

/**
 * EditableField — display/edit toggle for a single profile field. Shows the value as static
 * text plus an "Edit" button (FieldDisplayRow), and swaps to an `Input` in edit mode with
 * "Save"/"Cancel" buttons.
 *
 * Usage:
 *   <EditableField
 *     label="Full name"
 *     value={user.fullName}
 *     isSaving={isSaving}
 *     errorText={error}
 *     onSave={handleSaveFullName}
 *   />
 *
 * Presentational only — the actual save request is the parent's responsibility via `onSave`.
 * Two parent-controlled props drive the edit-mode lifecycle: `isSaving` keeps the field in
 * edit mode while a save is in flight and auto-exits once it flips back to false with no
 * `errorText`; if `errorText` is still set at that point, the field stays in edit mode so the
 * user can retry.
 *
 * Accessibility: Enter saves and Escape cancels while editing; the input receives focus
 * automatically on entering edit mode; whenever edit mode closes for any reason, focus moves
 * to the reappeared Edit button rather than being stranded on the now-unmounted Save/Cancel
 * buttons.
 */
import * as React from "react";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { FieldDisplayRow } from "@/components/FieldDisplayRow";

export interface EditableFieldProps {
  label: string;
  value: string;
  onSave: (newValue: string) => void;
  placeholder?: string;
  helperText?: string;
  /** Parent-supplied save error — keeps the field in edit mode when set. */
  errorText?: string | null;
  /** True while the parent's onSave request is in flight. */
  isSaving?: boolean;
  disabled?: boolean;
  type?: React.InputHTMLAttributes<HTMLInputElement>["type"];
  className?: string;
}

export function EditableField({
  label,
  value,
  onSave,
  placeholder,
  helperText,
  errorText = null,
  isSaving = false,
  disabled = false,
  type = "text",
  className,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [draftValue, setDraftValue] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const editButtonRef = React.useRef<HTMLButtonElement>(null);
  const wasSavingRef = React.useRef(false);
  // Distinguishes "edit mode just closed" (true -> false) from initial mount (also false),
  // so the focus-management effect below doesn't steal focus on load.
  const wasEditingRef = React.useRef(false);

  // Keep the draft in sync with an externally-changing `value` while not actively editing
  // (e.g. the parent refetched the profile elsewhere).
  React.useEffect(() => {
    if (!isEditing) setDraftValue(value);
  }, [value, isEditing]);

  React.useEffect(() => {
    if (wasSavingRef.current && !isSaving && !errorText) {
      setIsEditing(false);
    }
    wasSavingRef.current = isSaving;
  }, [isSaving, errorText]);

  React.useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    } else if (wasEditingRef.current) {
      editButtonRef.current?.focus();
    }
    wasEditingRef.current = isEditing;
  }, [isEditing]);

  function handleEdit() {
    setDraftValue(value);
    setIsEditing(true);
  }

  function handleCancel() {
    setDraftValue(value);
    setIsEditing(false);
  }

  function handleSave() {
    if (draftValue === value) {
      setIsEditing(false);
      return;
    }
    onSave(draftValue);
  }

  if (!isEditing) {
    return (
      <FieldDisplayRow
        className={className}
        label={label}
        value={value}
        placeholder={placeholder ?? "Not set"}
        onEdit={handleEdit}
        editDisabled={disabled}
        editButtonRef={editButtonRef}
      />
    );
  }

  return (
    <div className={className}>
      <Input
        ref={inputRef}
        label={label}
        type={type}
        value={draftValue}
        placeholder={placeholder}
        helperText={helperText}
        errorText={errorText ?? undefined}
        disabled={isSaving}
        onChange={(event) => setDraftValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            handleSave();
          } else if (event.key === "Escape") {
            event.preventDefault();
            handleCancel();
          }
        }}
      />
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" disabled={isSaving} onClick={handleSave}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
        <Button variant="ghost" size="sm" disabled={isSaving} onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
