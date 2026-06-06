import api from "./api";

// Fetch all chats for the authenticated user
export const fetchUserChats = async () => {
  const res = await api.get("/chats");
  return res.data;
};

// Fetch messages for a specific chat
export const fetchChatMessages = async (chatId) => {
  const res = await api.get(`/messages/chat/${chatId}`);
  return res.data;
};

// Send a text message
export const sendMessage = async (messageData) => {
  const res = await api.post("/messages", messageData);
  return res.data;
};

// Send a media message (file upload) with optional progress tracking
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

// Search users by name/email
export const searchUsers = async (query) => {
  const res = await api.get(`/users?search=${encodeURIComponent(query)}`);
  return res.data.users || res.data || [];
};

// Get a specific user's profile
export const getUserProfile = async (userId) => {
  const res = await api.get(`/users/${userId}`);
  return res.data;
};

// Create a 1-to-1 chat with another user
export const createChat = async (participantId) => {
  const res = await api.post("/chats", { participantId });
  return res.data;
};

// Delete a chat
export const deleteChat = async (chatId, deleteType = "everyone") => {
  const res = await api.delete(`/chats/${chatId}?deleteType=${deleteType}`);
  return res.data;
};

// Edit an existing message
export const editMessage = async (messageId, encryptedPayload) => {
  const res = await api.put(`/messages/${messageId}`, { encryptedPayload });
  return res.data;
};

// Delete a message only for the current user
export const deleteMessageForMe = async (messageId) => {
  const res = await api.delete(`/messages/delete-for-me/${messageId}`);
  return res.data;
};

// Delete a batch of messages only for the current user
export const deleteMessagesForMeBatch = async (messageIds) => {
  const res = await api.post("/messages/delete-for-me/batch", { messageIds });
  return res.data;
};

// Clear the entire message history of a chat or group only for the current user
export const clearChat = async (chatId, groupId) => {
  const res = await api.post("/messages/clear-chat", { chatId, groupId });
  return res.data;
};

// Build the full URL for media files.
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000");

export const getMediaUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BACKEND_URL}${path}`;
};
