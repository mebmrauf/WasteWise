import { cn } from "@/lib/utils";

export interface DividerProps {
  label?: string;
  className?: string;
}

export function Divider({ label, className }: DividerProps) {
  if (!label) {
    return <hr className={cn("rounded-none border-t border-neutral-200", className)} />;
  }

  return (
    <div role="separator" aria-orientation="horizontal" className={cn("flex items-center gap-3", className)}>
      <div className="flex-1 rounded-none border-t border-neutral-200" />
      <span className="text-caption text-neutral-500">{label}</span>
      <div className="flex-1 rounded-none border-t border-neutral-200" />
    </div>
  );
}
