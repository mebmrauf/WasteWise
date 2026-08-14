// ---------------------------------------------------------------------------
// Smart Pickup Reminder — tracks a user's recycling frequency pattern (the
// average gap between their completed pickups) and works out whether
// they're "due" for their next one, e.g.
//   "You usually recycle every 12 days — it's been 11. Schedule now?"
// ---------------------------------------------------------------------------

/** Need at least this many completed pickups before a pattern means anything. */
export const MIN_COMPLETED_PICKUPS_FOR_PATTERN = 2;

/**
 * Start nudging the user this many days *before* their usual interval is
 * up, so the reminder feels proactive rather than nagging after the fact.
 */
export const DUE_BUFFER_DAYS = 2;

export interface RecyclingReminderStats {
  /** Whether we have enough history to say anything about a pattern at all. */
  hasPattern: boolean;
  /** Average number of days between the user's completed pickups. */
  averageIntervalDays: number | null;
  lastPickupDate: Date | null;
  /** Whole days elapsed since the last completed pickup. */
  daysSinceLastPickup: number | null;
  /** True once the user is at/near the point they usually recycle again. */
  isDue: boolean;
  /** Ready-to-display personalized copy, or null when not due. */
  message: string | null;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function emptyStats(lastPickupDate: Date | null): RecyclingReminderStats {
  return {
    hasPattern: false,
    averageIntervalDays: null,
    lastPickupDate,
    daysSinceLastPickup: null,
    isDue: false,
    message: null,
  };
}

/**
 * @param completedPickupDates Completion timestamps for a single user's
 *   completed pickups, in any order.
 * @param now Injectable for testing; defaults to the current time.
 */
export function computeRecyclingReminder(
  completedPickupDates: Date[],
  now: Date = new Date(),
): RecyclingReminderStats {
  const sorted = [...completedPickupDates].sort((a, b) => a.getTime() - b.getTime());

  if (sorted.length < MIN_COMPLETED_PICKUPS_FOR_PATTERN) {
    return emptyStats(sorted.length ? sorted[sorted.length - 1] : null);
  }

  const intervalsDays: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    intervalsDays.push((sorted[i].getTime() - sorted[i - 1].getTime()) / MS_PER_DAY);
  }

  const rawAverage = intervalsDays.reduce((sum, d) => sum + d, 0) / intervalsDays.length;
  const averageIntervalDays = Math.max(1, Math.round(rawAverage));

  const lastPickupDate = sorted[sorted.length - 1];
  const daysSinceLastPickup = Math.max(
    0,
    Math.floor((now.getTime() - lastPickupDate.getTime()) / MS_PER_DAY),
  );

  const isDue = daysSinceLastPickup >= averageIntervalDays - DUE_BUFFER_DAYS;

  const message = isDue
    ? `You usually recycle every ${averageIntervalDays} day${averageIntervalDays === 1 ? "" : "s"} — it's been ${daysSinceLastPickup}. Want to line up your next pickup now?`
    : null;

  return {
    hasPattern: true,
    averageIntervalDays,
    lastPickupDate,
    daysSinceLastPickup,
    isDue,
    message,
  };
}
