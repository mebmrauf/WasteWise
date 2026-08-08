import { prisma } from "./prisma";
import { getIO, userRoomName } from "../realtime/socket";
import type { NotificationType } from "@prisma/client";
import { logger } from "./logger";

export const NOTIFICATION_RECEIVED_EVENT = "notification:received";

interface CreateNotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedPickupRequestId?: string;
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
    
    return notification;
  } catch (error) {
    logger.error({ err: error, userId: opts.userId }, "Failed to create notification");
  }
}
