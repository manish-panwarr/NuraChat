import api from "./api";

/**
 * Fetch all chats for the authenticated user
 * Backend now uses req.user._id from JWT, no need to pass userId
 */
export const fetchUserChats = async () => {
  const res = await api.get("/chats");
  return res.data;
};

/**
 * Fetch messages for a specific chat
 */
export const fetchChatMessages = async (chatId) => {
  const res = await api.get(`/messages/chat/${chatId}`);
  return res.data;
};

/**
 * Send a text message
 */
export const sendMessage = async (messageData) => {
  const res = await api.post("/messages", messageData);
  return res.data;
};

/**
 * Send a media message (file upload) with optional progress tracking
 */
export const sendMediaMessage = async (formData, onUploadProgress) => {
  const config = {
    headers: { "Content-Type": "multipart/form-data" },
  };

  if (onUploadProgress) {
    config.onUploadProgress = (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      onUploadProgress(percentCompleted);
    };
  }

  const res = await api.post("/messages/media", formData, config);
  return res.data;
};

/**
 * Search users by name/email
 * Backend returns { users: [...] } wrapper
 */
export const searchUsers = async (query) => {
  const res = await api.get(`/users?search=${encodeURIComponent(query)}`);
  return res.data.users || res.data || [];
};

/**
 * Get a specific user's profile
 */
export const getUserProfile = async (userId) => {
  const res = await api.get(`/users/${userId}`);
  return res.data;
};

/**
 * Create a 1-to-1 chat with another user
 * Backend expects { participantId } and derives current user from JWT
 */
export const createChat = async (participantId) => {
  const res = await api.post("/chats", { participantId });
  return res.data;
};

/**
 * Delete a chat
 * @param {string} chatId
 * @param {string} deleteType - "me" (hide for me) or "everyone" (delete permanently)
 */
export const deleteChat = async (chatId, deleteType = "everyone") => {
  const res = await api.delete(`/chats/${chatId}?deleteType=${deleteType}`);
  return res.data;
};

/**
 * Build the full URL for media files.
 * Handles both Cloudinary URLs (start with http) and legacy local paths.
 */
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000");

export const getMediaUrl = (path) => {
  if (!path) return null;
  // Cloudinary URLs and other absolute URLs
  if (path.startsWith("http")) return path;
  // Legacy local paths
  return `${BACKEND_URL}${path}`;
};
