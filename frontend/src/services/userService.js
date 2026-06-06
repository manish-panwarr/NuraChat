import api from "./api";

const userService = {
  fetchCurrentUser: async () => {
    const res = await api.get("/users/me");
    return res.data;
  },

  fetchAllUsers: async () => {
    const res = await api.get("/users");
    return res.data.users || res.data || [];
  },

  fetchRandomUsers: async (count = 7) => {
    const res = await api.get(`/users/random?count=${count}`);
    return res.data.users || res.data || [];
  },

  fetchUserById: async (userId) => {
    const res = await api.get(`/users/${userId}`);
    return res.data.user || res.data;
  },

  updateMyProfile: async (updates) => {
    const res = await api.patch("/users/me/profile", updates);
    return res.data;
  },

  changePassword: async ({ currentPassword, newPassword }) => {
    const res = await api.patch("/users/me/password", {
      currentPassword,
      newPassword,
    });
    return res.data;
  },

  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append("profileImage", file);
    const res = await api.patch("/users/me/avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },
};

export default userService;
