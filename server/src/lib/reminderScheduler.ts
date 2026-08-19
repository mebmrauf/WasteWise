// ---------------------------------------------------------------------------
// Smart Pickup Reminder — periodic sweep that turns each user's recycling
// pattern into an actual push notification (bell + socket, via
// lib/notifications.ts) once they're "due", e.g.
//   "You usually recycle every 12 days — it's been 11. Schedule now?"
// No external scheduling dependency: a single in-process interval is enough
// for this app's scale, mirroring how ensureAdminUser() seeds state on boot
// in index.ts.
// ---------------------------------------------------------------------------
import { NotificationType, PickupStatus, Role } from "@prisma/client";
import { prisma } from "./prisma";
import { logger } from "./logger";
import { createNotification } from "./notifications";
import { computeRecyclingReminder } from "./recyclingPattern";

/** How often to re-scan all users for a due reminder. */
const SWEEP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/** Don't re-notify the same user more often than this, even if still due. */
const MIN_HOURS_BETWEEN_REMINDER_NOTIFICATIONS = 20;

export function startRecyclingReminderScheduler(): NodeJS.Timeout {
  const sweep = () => {
    runReminderSweep().catch((err) => {
      logger.error({ err }, "Smart Pickup Reminder sweep failed");
    });
  };

  sweep(); // also run once immediately on boot, don't wait a full interval
  return setInterval(sweep, SWEEP_INTERVAL_MS);
}

async function runReminderSweep() {
  const users = await prisma.user.findMany({
    where: { role: Role.USER },
    select: { id: true },
  });

  for (const user of users) {
    await evaluateAndNotify(user.id);
  }

  logger.debug({ usersChecked: users.length }, "Smart Pickup Reminder sweep complete");
}

async function evaluateAndNotify(userId: string) {
  const activePickupCount = await prisma.pickupRequest.count({
    where: {
      requesterId: userId,
      status: { notIn: [PickupStatus.COMPLETED, PickupStatus.CANCELLED] },
    },
  });

  if (activePickupCount > 0) return;

  const completedPickups = await prisma.pickupRequest.findMany({
    where: { requesterId: userId, status: PickupStatus.COMPLETED },
    select: { updatedAt: true },
    orderBy: { updatedAt: "asc" },
  });

  const reminder = computeRecyclingReminder(
    completedPickups.map((p: { updatedAt: Date }) => p.updatedAt),
  );
  if (!reminder.isDue || !reminder.message) {
    return;
  }

  const lastReminder = await prisma.notification.findFirst({
    where: { userId, type: NotificationType.REMINDER },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (lastReminder) {
    const hoursSinceLastReminder = (Date.now() - lastReminder.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastReminder < MIN_HOURS_BETWEEN_REMINDER_NOTIFICATIONS) {
      return;
    }
  }

  await createNotification({
    userId,
    type: NotificationType.REMINDER,
    title: "Time to schedule your next pickup?",
    message: reminder.message,
  });
}
