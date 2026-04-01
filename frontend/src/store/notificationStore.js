import { create } from "zustand";
import notificationService from "../services/notificationService";

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const data = await notificationService.getMyNotifications();
      const unreadCount = data.filter(n => !n.isRead).length;
      set({ notifications: data, unreadCount, isLoading: false });
    } catch (error) {
      console.error("Failed to fetch notifications", error);
      set({ isLoading: false });
    }
  },

  addNotification: (notification) => {
    set((state) => {
      const exists = state.notifications.find(n => n._id === notification._id);
      if (exists) return state;
      
      const updated = [notification, ...state.notifications];
      const count = updated.filter(n => !n.isRead).length;
      return { notifications: updated, unreadCount: count };
    });
  },

  markAsRead: async (id) => {
    try {
      await notificationService.markAsRead(id);
      set((state) => {
        const updated = state.notifications.map(n => 
          n._id === id ? { ...n, isRead: true } : n
        );
        const count = updated.filter(n => !n.isRead).length;
        return { notifications: updated, unreadCount: count };
      });
    } catch (error) {
      console.error("Failed to mark as read", error);
    }
  },

  removeNotification: async (id) => {
    try {
      await notificationService.deleteNotification(id);
      set((state) => {
        const updated = state.notifications.filter(n => n._id !== id);
        const count = updated.filter(n => !n.isRead).length;
        return { notifications: updated, unreadCount: count };
      });
    } catch (error) {
      console.error("Failed to delete notification", error);
    }
  },

  clearAll: () => set({ notifications: [], unreadCount: 0 })
}));

export default useNotificationStore;
