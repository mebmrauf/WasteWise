import { authFetch } from "./auth";
import type { NotificationType } from "@prisma/client";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  relatedPickupRequestId: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getNotifications(): Promise<Notification[]> {
  return authFetch("/notifications");
}

export async function markNotificationAsRead(id: string): Promise<Notification> {
  return authFetch(`/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllNotificationsAsRead(): Promise<{ success: boolean }> {
  return authFetch("/notifications/read-all", { method: "PATCH" });
}
