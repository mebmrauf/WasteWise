"use client";

import * as React from "react";
import { Bell, Check, Circle, Trash2, X } from "lucide-react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/Button";
import { NOTIFICATION_RECEIVED_EVENT, getTrackingSocket } from "@/lib/socket";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type Notification,
} from "@/lib/api/notifications";
import { formatDistanceToNow } from "date-fns";

export function NotificationsPanel() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  React.useEffect(() => {
    // Load initial notifications
    setIsLoading(true);
    getNotifications()
      .then((data) => {
        setNotifications(data);
      })
      .catch((err) => {
        console.error("Failed to load notifications", err);
      })
      .finally(() => {
        setIsLoading(false);
      });

    // Listen for new notifications
    const socket = getTrackingSocket();
    
    const handleNewNotification = (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
    };

    socket.on(NOTIFICATION_RECEIVED_EVENT, handleNewNotification);

    return () => {
      socket.off(NOTIFICATION_RECEIVED_EVENT, handleNewNotification);
    };
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Optimistic update
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await markNotificationAsRead(id);
    } catch (err) {
      // Revert if failed
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)));
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await markAllNotificationsAsRead();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
        aria-label="Notifications"
      >
        <Icon icon={Bell} size="sm" className="text-neutral-600" />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 flex h-2 w-2 items-center justify-center rounded-full bg-error-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-x-4 sm:inset-x-auto sm:absolute sm:right-0 top-16 sm:top-12 z-50 w-auto sm:w-[32rem] h-[20rem] sm:h-[24rem] overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-neutral-200/50 flex flex-col">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 bg-neutral-50/80 backdrop-blur-sm">
            <h3 className="text-h4 text-neutral-900 font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-caption text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading && notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-body-sm text-neutral-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-12 flex flex-col items-center justify-center text-center">
                <div className="h-12 w-12 rounded-full bg-neutral-50 flex items-center justify-center mb-3">
                  <Icon icon={Bell} size="md" className="text-neutral-400" />
                </div>
                <p className="text-body font-medium text-neutral-900">All caught up!</p>
                <p className="text-body-sm text-neutral-500 mt-1">Check back later for new notifications.</p>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`group flex items-start gap-4 p-4 transition-colors hover:bg-neutral-50 ${
                      notification.isRead ? "opacity-75" : "bg-primary-50/30"
                    }`}
                  >
                    <div className="mt-1 flex-shrink-0">
                      {!notification.isRead ? (
                        <div className="h-2 w-2 rounded-full bg-primary-500 mt-2 shadow-sm" />
                      ) : (
                        <Icon icon={Check} size="sm" className="text-neutral-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-body-sm ${!notification.isRead ? "font-semibold text-neutral-900" : "font-medium text-neutral-700"}`}>
                        {notification.title}
                      </p>
                      <p className="mt-1 text-caption text-neutral-500 leading-snug break-words">
                        {notification.message}
                      </p>
                      <p className="mt-2 text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                        {/* 
                            date-fns formatDistanceToNow is generally good, but if we don't have it imported 
                            properly or the timestamp is off, let's just use standard string parsing for safety.
                            We actually imported formatDistanceToNow, but we'll try/catch it.
                        */}
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    
                    {!notification.isRead && (
                      <button
                        onClick={(e) => void handleMarkAsRead(notification.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-neutral-200 rounded-md text-neutral-500"
                        title="Mark as read"
                      >
                        <Icon icon={Check} size="sm" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
