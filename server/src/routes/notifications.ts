import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../lib/rbac";
import { sendData, sendError } from "../lib/apiResponse";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get("/", async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    sendData(res, 200, notifications);
  } catch (error) {
    next(error);
  }
});

notificationsRouter.patch("/:id/read", async (req, res, next) => {
  try {
    const notificationId = req.params.id;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      sendError(res, 404, "NOT_FOUND", "Notification not found");
      return;
    }

    if (notification.userId !== req.user!.id) {
      sendError(res, 403, "FORBIDDEN", "Not your notification");
      return;
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    sendData(res, 200, updated);
  } catch (error) {
    next(error);
  }
});

notificationsRouter.patch("/read-all", async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });

    sendData(res, 200, { success: true });
  } catch (error) {
    next(error);
  }
});
