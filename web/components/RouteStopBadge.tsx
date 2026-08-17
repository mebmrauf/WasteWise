import * as React from "react";

export interface RouteStopBadgeProps {
  sequence: number;
  total: number;
}

/** The one canonical "this pickup is stop N of M on the route" indicator — shared so the
 * route planner and the active-pickup view can never visually drift apart on this again. */
export function RouteStopBadge({ sequence, total }: RouteStopBadgeProps) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-600 text-caption font-bold text-white">
        {sequence}
      </span>
      <span className="text-caption text-neutral-500">of {total}</span>
    </span>
  );
}
