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

export function formatBdt(amount: number): string {
  return `৳${amount.toFixed(2)}`;
}
