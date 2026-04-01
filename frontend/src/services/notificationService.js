import api from "./api";

const notificationService = {
  getMyNotifications: async () => {
    const res = await api.get("/notifications");
    return res.data;
  },

  markAsRead: async (notificationId) => {
    const res = await api.put(`/notifications/${notificationId}/read`);
    return res.data;
  },

  deleteNotification: async (notificationId) => {
    const res = await api.delete(`/notifications/${notificationId}`);
    return res.data;
  }
};

export default notificationService;
