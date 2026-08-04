// Rule-label-rule divider between OAuthButtons and the credential form. Colocated here
// rather than web/components/ since it's specific to the auth pages, not a general primitive.
export interface OrDividerProps {
  /** Defaults to "or continue with email" — override for other contexts. */
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
