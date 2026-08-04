/**
 * FieldDisplayRow — label + value (with placeholder fallback) + optional "Edit" trigger
 * button. Used both as EditableField's own non-editing display branch and standalone for
 * fields with a custom editor (e.g. address, backed by AddressAutocomplete) or no editor
 * at all (e.g. a read-only account email).
 *
 * Usage:
 *   <FieldDisplayRow
 *     label="Address"
 *     value={extras?.formattedAddress ?? ""}
 *     placeholder={extras ? "Not set" : "Loading…"}
 *     onEdit={handleEditAddress}
 *     editDisabled={!extras}
 *   />
 *   <FieldDisplayRow label="Email" value={user.email} />
 *
 * Accessibility: the Edit button gets `aria-label="Edit {label}"` so multiple rows on one
 * page stay distinguishable to assistive tech. `editButtonRef` lets a caller move focus
 * back onto this button once it remounts (e.g. after EditableField closes its editor).
 */
import * as React from "react";
import { Button } from "@/components/Button";

export interface FieldDisplayRowProps {
  /** Field label rendered above the value, e.g. "Full name". */
  label: string;
  /** Current value. Falsy renders `placeholder` instead. */
  value: string;
  /** Shown when `value` is falsy. */
  placeholder?: string;
  /** Omit for a read-only row with no Edit button. Provide to render a ghost/sm "Edit" button. */
  onEdit?: () => void;
  /** Disables the Edit button (e.g. while the row's data is still loading). */
  editDisabled?: boolean;
  /** Forwarded to the underlying Edit button, for focus management after it remounts. */
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
