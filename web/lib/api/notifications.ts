import { authFetch } from "./auth";
export type NotificationType =
  | "PICKUP_STATUS_UPDATE"
  | "OFFER_RECEIVED"
  | "REMINDER"
  | "VERIFICATION_UPDATE"
  | "COMPLAINT_UPDATE"
  | "GENERIC";

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
