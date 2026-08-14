"use client";

import * as React from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { Icon } from "@/components/Icon";
import { Card } from "@/components/Card";
import { getPickupReminderSummary, type PickupReminderSummary } from "@/lib/api/pickups";

/**
 * Smart Pickup Reminder — surfaces on the dashboard home once the user's
 * recycling pattern says they're due, e.g. "You usually recycle every 12
 * days — it's been 11. Schedule now?" (see CSE471 Assignment 02, Feature 2).
 *
 * Renders nothing while loading, on error, or when the user isn't due yet —
 * this is a nudge, not a persistent fixture.
 */
export function SmartPickupReminderBanner() {
  const [reminder, setReminder] = React.useState<PickupReminderSummary | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    getPickupReminderSummary()
      .then((data) => {
        if (!cancelled) setReminder(data);
      })
      .catch((err) => {
        console.error("Failed to load pickup reminder", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (
    !reminder ||
    !reminder.isDue ||
    reminder.averageIntervalDays == null ||
    reminder.daysSinceLastPickup == null
  ) {
    return null;
  }

  const intervalDays = reminder.averageIntervalDays;

  return (
    <Card className="mb-8 flex flex-col gap-4 border-warning-500/30 bg-warning-50 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-warning-500/15">
          <Icon icon={Clock} size="sm" className="text-warning-700" />
        </div>
        <div>
          <p className="text-body font-semibold text-warning-700">
            You usually recycle every {intervalDays} day{intervalDays === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-body-sm text-warning-700/80">
            It&apos;s been {reminder.daysSinceLastPickup} — want to line up your next pickup now?
          </p>
        </div>
      </div>
      <Link
        href="/dashboard/pickups/new"
        className="inline-flex h-10 flex-shrink-0 items-center justify-center rounded-md bg-warning-500 px-5 text-body-sm font-medium text-neutral-0 transition-colors hover:bg-warning-700 active:bg-warning-700"
      >
        Schedule now
      </Link>
    </Card>
  );
}
