import * as React from "react";
import { Clock, MapPin, Scale } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CategoryQuantityRow } from "@/components/CategoryQuantityRow";
import { Icon } from "@/components/Icon";
import type { WasteCategory } from "@/components/WasteCategorySelector";
import { cn } from "@/lib/utils";

interface AvailableJobItem {
  id: string;
  category: WasteCategory;
  quantityLabel: string;
}

interface AvailableJobListItemPickup {
  id: string;
  pickupFormattedAddress: string;
  timeSlotStart: string;
  timeSlotEnd: string;
  items: AvailableJobItem[];
}

export interface AvailableJobListItemProps {
  pickup: AvailableJobListItemPickup;
  estimatedWeightRangeLabel: string;
  onSelect?: (pickupId: string) => void;
  className?: string;
}

export function formatTimeSlot(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const dateLabel = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const startTime = start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const endTime = end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${dateLabel} · ${startTime} - ${endTime}`;
}

export function AvailableJobListItem({
  pickup,
  estimatedWeightRangeLabel,
  onSelect,
  className,
}: AvailableJobListItemProps) {
  return (
    <Card className={cn("glass-panel border-0 shadow-md hover:shadow-lg transition-shadow flex flex-col gap-4 rounded-2xl p-6", className)}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-body-sm text-neutral-700">
          <Icon icon={MapPin} size="sm" className="text-neutral-500" />
          <span>{pickup.pickupFormattedAddress}</span>
        </div>
        <div className="flex items-center gap-2 text-body-sm text-neutral-700">
          <Icon icon={Clock} size="sm" className="text-neutral-500" />
          <span>{formatTimeSlot(pickup.timeSlotStart, pickup.timeSlotEnd)}</span>
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
        {onSelect && (
          <Button variant="secondary" size="sm" onClick={() => onSelect(pickup.id)}>
            View details
          </Button>
        )}
      </div>
    </Card>
  );
}
