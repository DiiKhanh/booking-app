import { create } from "zustand";

interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;

  addNotification: (n: Omit<Notification, "id" | "read" | "createdAt">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (n) => {
    const notification: Notification = {
      ...n,
      id: crypto.randomUUID(),
      read: false,
      createdAt: new Date().toISOString(),
    };
    const updated = [notification, ...get().notifications];
    set({
      notifications: updated,
      unreadCount: updated.filter((x) => !x.read).length,
    });
  },

  markAsRead: (id) => {
    const updated = get().notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    set({ notifications: updated, unreadCount: updated.filter((n) => !n.read).length });
  },

  markAllAsRead: () => {
    set({
      notifications: get().notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    });
  },

  removeNotification: (id) => {
    const updated = get().notifications.filter((n) => n.id !== id);
    set({ notifications: updated, unreadCount: updated.filter((n) => !n.read).length });
  },

  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));
