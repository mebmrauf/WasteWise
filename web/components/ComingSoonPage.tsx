import type { LucideIcon } from "lucide-react";
import { ComingSoonCard } from "@/components/ComingSoonCard";
import { PageContainer } from "@/components/PageContainer";

export interface ComingSoonPageProps {
  title: string;
  icon: LucideIcon;
  label: string;
  description: string;
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
