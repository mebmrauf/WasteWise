import * as React from "react";
import { Button } from "@/components/Button";

export interface FieldDisplayRowProps {
  label: string;
  value: string;
  placeholder?: string;
  onEdit?: () => void;
  editDisabled?: boolean;
  editButtonRef?: React.Ref<HTMLButtonElement>;
  className?: string;
}

export function FieldDisplayRow({
  label,
  value,
  placeholder = "Not set",
  onEdit,
  editDisabled = false,
  editButtonRef,
  className,
}: FieldDisplayRowProps) {
  return (
    <div className={className}>
      <p className="text-label text-neutral-800">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="text-body-sm text-neutral-900">
          {value || <span className="text-neutral-500">{placeholder}</span>}
        </span>
        {onEdit && (
          <Button
            ref={editButtonRef}
            variant="ghost"
            size="sm"
            aria-label={`Edit ${label}`}
            disabled={editDisabled}
            onClick={onEdit}
          >
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}
