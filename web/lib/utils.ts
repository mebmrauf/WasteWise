// Joins conditional Tailwind class names (arrays/booleans/nullish are handled) without
// pulling in clsx/tailwind-merge. Unlike tailwind-merge, this does NOT resolve conflicting
// utility classes — a caller-supplied `p-10` isn't guaranteed to win over a component's own
// `p-5`. Known limitation until/if tailwind-merge gets added.
export type ClassValue = string | number | boolean | null | undefined | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];

  const walk = (value: ClassValue) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(walk);
    } else {
      out.push(String(value));
    }
  };

  inputs.forEach(walk);
  return out.join(" ");
}
