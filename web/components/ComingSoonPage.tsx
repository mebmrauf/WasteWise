/**
 * ComingSoonPage — full-page shell for a not-yet-built dashboard route: an `<h1>` page title
 * above a single `ComingSoonCard`, inside `PageContainer`. Lives in web/components/ rather
 * than scoped under app/(user)/dashboard/, since Collector/Recycling Company/Admin
 * placeholder routes will likely want the same shape later.
 *
 * Usage:
 *   <ComingSoonPage
 *     title="Complaints"
 *     icon={Megaphone}
 *     label="Complaints"
 *     description="File a complaint about a pickup and follow its status through to resolution."
 *   />
 *
 * `title` and `label` are separate props (every current caller passes the same string for
 * both) so a page title can diverge from the card's own heading if a future caller needs that.
 */
import type { LucideIcon } from "lucide-react";
import { ComingSoonCard } from "@/components/ComingSoonCard";
import { PageContainer } from "@/components/PageContainer";

export interface ComingSoonPageProps {
  /** Page-level `<h1>` heading. */
  title: string;
  icon: LucideIcon;
  /** `ComingSoonCard`'s heading — usually, but not necessarily, the same string as `title`. */
  label: string;
  description: string;
  /** Forwarded to `ComingSoonCard`. Defaults to "Coming soon". */
  badgeLabel?: string;
}

export function ComingSoonPage({ title, icon, label, description, badgeLabel }: ComingSoonPageProps) {
  return (
    <PageContainer className="py-8 lg:py-12">
      <h1 className="text-h1 text-neutral-900">{title}</h1>
      <div className="mt-8 max-w-form">
        <ComingSoonCard icon={icon} label={label} description={description} badgeLabel={badgeLabel} />
      </div>
    </PageContainer>
  );
}
