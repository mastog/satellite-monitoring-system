import { create } from "zustand";

export interface Notification {
  id: string;
  userId: string;
  type: "conjunction" | "comment_reply" | "medal_unlock";
  title: string;
  body: string;
  metadata: string;
  read: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleOpen: () => void;
  fetchNotifications: () => Promise<void>;
  markAsRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,
  setIsOpen: (open) => set({ isOpen: open }),
  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),

  fetchNotifications: async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      set({
        notifications: data.notifications ?? [],
        unreadCount: data.unreadCount ?? 0,
      });
    } catch {}
  },

  markAsRead: async (ids) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      set((s) => ({
        notifications: s.notifications.map((n) =>
          ids.includes(n.id) ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(
          0,
          s.unreadCount -
            ids.filter((id) =>
              s.notifications.find((n) => n.id === id && !n.read)
            ).length
        ),
      }));
    } catch {}
  },

  markAllRead: async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      set((s) => ({
        notifications: s.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch {}
  },
}));
