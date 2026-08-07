"use client";

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
  errorText?: string | null;
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
  const wasEditingRef = React.useRef(false);

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
