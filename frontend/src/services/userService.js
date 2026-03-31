import api from "./api";

const userService = {
  /**
   * Get current authenticated user
   */
  fetchCurrentUser: async () => {
    const res = await api.get("/users/me");
    return res.data;
  },

  /**
   * Get all users (for search/listing)
   */
  fetchAllUsers: async () => {
    const res = await api.get("/users");
    return res.data.users || res.data || [];
  },

  /**
   * Get user by ID
   */
  fetchUserById: async (userId) => {
    const res = await api.get(`/users/${userId}`);
    return res.data.user || res.data;
  },

  /**
   * Update current user's profile
   */
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

  /**
   * Upload user avatar
   */
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
