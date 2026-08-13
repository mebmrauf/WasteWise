import { prisma } from "./prisma";
import { createNotification } from "./notifications";
import { logger } from "./logger";

const REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Nudges users who signed up with a password (not OAuth) and still haven't
 * verified their email 24h after signup — and every 24h after that, until
 * they do. These are in-app notifications only, not more email, so there's
 * no deliverability/spam cost to repeating them indefinitely.
 */
export async function runEmailVerificationReminderSweep(): Promise<void> {
  const cutoff = new Date(Date.now() - REMINDER_INTERVAL_MS);

  const dueUsers = await prisma.user.findMany({
    where: {
      isEmailVerified: false,
      createdAt: { lte: cutoff },
      OR: [{ emailVerificationReminderSentAt: null }, { emailVerificationReminderSentAt: { lte: cutoff } }],
    },
    select: { id: true },
  });

  for (const user of dueUsers) {
    try {
      await createNotification({
        userId: user.id,
        type: "REMINDER",
        title: "Verify your email",
        message: "Please verify your email address to keep your WasteWise account secure.",
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerificationReminderSentAt: new Date() },
      });
    } catch (err) {
      logger.error({ err, userId: user.id }, "Failed to send email verification reminder");
    }
  }

  if (dueUsers.length > 0) {
    logger.info({ count: dueUsers.length }, "Sent email verification reminders");
  }
}

export function startEmailVerificationReminderScheduler(): void {
  void runEmailVerificationReminderSweep();
  setInterval(() => {
    void runEmailVerificationReminderSweep();
  }, 60 * 60 * 1000);
}
