import { prisma } from "./prisma";
import { getIO, userRoomName } from "../realtime/socket";
import type { NotificationType } from "@prisma/client";
import { logger } from "./logger";
import { sendEmail, buildNotificationEmail } from "./mailer";

export const NOTIFICATION_RECEIVED_EVENT = "notification:received";

type EmailPreferenceField = "emailNotificationsEnabled" | "rewardsEmailNotificationsEnabled";

interface CreateNotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedPickupRequestId?: string;
  /**
   * When set, also emails the user if they have an address on file and this
   * preference enabled. Omit for notifications that should stay in-app only
   * (e.g. the email-verification reminder — repeating that by email would be
   * the exact spam problem it's designed to avoid).
   */
  emailPreference?: EmailPreferenceField;
}

export async function createNotification(opts: CreateNotificationOptions) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: opts.userId,
        type: opts.type,
        title: opts.title,
        message: opts.message,
        relatedPickupRequestId: opts.relatedPickupRequestId,
      },
    });

    try {
      const io = getIO();
      const emitter = io.to(userRoomName(opts.userId)) as unknown as {
        emit: (event: string, payload: unknown) => void;
      };

      emitter.emit(NOTIFICATION_RECEIVED_EVENT, notification);
    } catch (socketError) {
      // Socket io might not be initialized in some contexts (e.g. tests)
      logger.debug({ err: socketError }, "Skipped real-time broadcast for notification");
    }

    if (opts.emailPreference) {
      void sendNotificationEmail(opts.userId, opts.title, opts.message, opts.emailPreference);
    }

    return notification;
  } catch (error) {
    logger.error({ err: error, userId: opts.userId }, "Failed to create notification");
  }
}

async function sendNotificationEmail(
  userId: string,
  title: string,
  message: string,
  preferenceField: EmailPreferenceField,
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, emailNotificationsEnabled: true, rewardsEmailNotificationsEnabled: true },
    });
    if (!user?.email) return;
    const isEnabled = preferenceField === "emailNotificationsEnabled" ? user.emailNotificationsEnabled : user.rewardsEmailNotificationsEnabled;
    if (!isEnabled) return;

    const { subject, html, text } = buildNotificationEmail(title, message);
    await sendEmail({ to: user.email, subject, html, text });
    logger.info({ userId, preferenceField }, "Sent notification email");
  } catch (err) {
    logger.error({ err, userId }, "Failed to send notification email");
  }
}
