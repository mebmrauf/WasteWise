export interface OrDividerProps {
  label?: string;
}

export function OrDivider({ label = "or continue with email" }: OrDividerProps) {
  return (
    <div className="my-6 flex items-center gap-3">
      <div className="h-px flex-1 bg-neutral-200" />
      <span className="text-caption text-neutral-400">{label}</span>
      <div className="h-px flex-1 bg-neutral-200" />
    </div>
  );
}
