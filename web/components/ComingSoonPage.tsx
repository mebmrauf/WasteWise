import type { LucideIcon } from "lucide-react";
import { ComingSoonCard } from "@/components/ComingSoonCard";
import { PageContainer } from "@/components/PageContainer";
import { Card } from "@/components/Card";

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
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-emerald-100 p-8 mb-8 rounded-2xl shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">{title}</h1>
        <p className="mt-2 text-neutral-600">{description}</p>
      </Card>
      <div className="mt-8 max-w-form">
        <ComingSoonCard icon={icon} label={label} description={description} badgeLabel={badgeLabel} />
      </div>
    </PageContainer>
  );
}
