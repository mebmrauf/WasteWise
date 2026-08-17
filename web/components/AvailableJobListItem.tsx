import * as React from "react";
import { Clock, MapPin, Scale, Phone } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CategoryQuantityRow } from "@/components/CategoryQuantityRow";
import { Icon } from "@/components/Icon";
import type { WasteCategory } from "@/components/WasteCategorySelector";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { resolveAvatarUrl } from "@/lib/api/users";

interface AvailableJobItem {
  id: string;
  category: WasteCategory;
  quantityLabel: string;
}

interface AvailableJobListItemPickup {
  id: string;
  pickupFormattedAddress: string;
  pickupDate: string;
  items: AvailableJobItem[];
  requester?: {
    fullName: string;
    phone: string | null;
    avatarUrl?: string | null;
  } | null;
}

export interface AvailableJobListItemProps {
  pickup: AvailableJobListItemPickup;
  estimatedWeightRangeLabel: string;
  onSelect?: (pickupId: string) => void;
  onIgnore?: (pickupId: string) => void;
  className?: string;
}

export function formatDate(dateIso: string): string {
  const date = new Date(dateIso);
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export function AvailableJobListItem({
  pickup,
  estimatedWeightRangeLabel,
  onSelect,
  onIgnore,
  className,
}: AvailableJobListItemProps) {
  return (
    <Card className={cn("glass-panel border-0 shadow-md hover:shadow-lg transition-shadow flex flex-col gap-4 rounded-2xl p-6", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          {pickup.requester && (
            <div className="flex items-center gap-3">
              <Avatar src={resolveAvatarUrl(pickup.requester.avatarUrl ?? null)} name={pickup.requester.fullName} size="md" />
              <div className="flex flex-col">
                <span className="text-body font-semibold text-neutral-900 leading-tight">
                  {pickup.requester.fullName}
                </span>
                {pickup.requester.phone ? (
                  <div className="flex items-center gap-1 text-body-sm text-neutral-500">
                    <Icon icon={Phone} size="sm" />
                    <span>{pickup.requester.phone}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-body-sm text-neutral-400 italic">
                    <Icon icon={Phone} size="sm" />
                    <span>No phone provided</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex items-center gap-2 text-body-sm text-neutral-700">
              <Icon icon={MapPin} size="sm" className="text-neutral-500" />
              <span>{pickup.pickupFormattedAddress}</span>
            </div>
            <div className="flex items-center gap-2 text-body-sm text-neutral-700">
              <Icon icon={Clock} size="sm" className="text-neutral-500" />
              <span>{formatDate(pickup.pickupDate)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {pickup.items.map((item) => (
          <CategoryQuantityRow key={item.id} category={item.category} quantityLabel={item.quantityLabel} />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-neutral-200 pt-4">
        <div className="flex items-center gap-2 text-body-sm text-neutral-500">
          <Icon icon={Scale} size="sm" />
          <span>
            Estimated{" "}
            <span className="font-data text-data-base text-neutral-900">{estimatedWeightRangeLabel}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onIgnore && (
            <Button variant="ghost" size="sm" onClick={() => onIgnore(pickup.id)}>
              Dismiss
            </Button>
          )}
          {onSelect && (
            <Button variant="secondary" size="sm" onClick={() => onSelect(pickup.id)}>
              View details
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
