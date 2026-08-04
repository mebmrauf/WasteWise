/**
 * Divider — general-purpose horizontal rule for separating sections within a longer
 * form/page. Distinct from app/_components/OrDivider.tsx, which is scoped to the auth
 * pages' "or continue with email" split.
 *
 * Usage:
 *   <Divider />
 *   <Divider label="Notification preferences" />
 *
 * With no `label`, renders a semantic `<hr>`. With a `label`, renders a line/label/line
 * group (role="separator") since an `<hr>` can't contain child text.
 *
 * Both rule-line segments use `border-t border-neutral-200`, never `h-px`/`w-px` — this
 * project's tailwind.config.ts fully overrides `theme.spacing`, which removes Tailwind's
 * implicit `px` key, so `h-px`/`w-px` silently resolve to nothing.
 */
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
