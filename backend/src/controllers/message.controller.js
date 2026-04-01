import Message from "../models/message.model.js";
import Chat from "../models/chat.model.js";
import { getIO, getSocketId } from "../sockets/socket.js";
import {
  createTextMessage,
  createMediaMessage,
  getMessagesByChatId,
  deleteMessageById,
} from "../services/message.service.js";

/**
 * SEND TEXT MESSAGE
 * Uses req.user._id as sender (from auth middleware)
 */
export const sendMessage = async (req, res) => {
  const { chatId, messageType, encryptedPayload } = req.body;
  const senderId = req.user._id;

  if (!chatId || !encryptedPayload) {
    return res.status(400).json({ message: "chatId and encryptedPayload are required" });
  }

  // Verify user is participant of this chat
  const chat = await Chat.findById(chatId);
  if (!chat) return res.status(404).json({ message: "Chat not found" });

  const isParticipant = chat.participants.some(
    (p) => p.toString() === senderId.toString()
  );
  if (!isParticipant) {
    return res.status(403).json({ message: "Access denied" });
  }

  const saved = await createTextMessage(chatId, senderId, encryptedPayload, messageType || "text");

  // Emit to receiver via socket
  const receiverId = chat.participants.find(
    (p) => p.toString() !== senderId.toString()
  );
  if (receiverId) {
    const receiverSocketId = getSocketId(receiverId.toString());
    if (receiverSocketId) {
      getIO().to(receiverSocketId).emit("new-message", saved);
    }
  }

  res.status(201).json(saved);
};

/**
 * GET MESSAGES BY CHAT ID
 * Sorted by createdAt ascending, verifies user is participant
 */
export const getMessagesByChat = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user._id;

  // Verify user is participant
  const chat = await Chat.findById(chatId);
  if (!chat) return res.status(404).json({ message: "Chat not found" });

  const isParticipant = chat.participants.some(
    (p) => p.toString() === userId.toString()
  );
  if (!isParticipant) {
    return res.status(403).json({ message: "Access denied" });
  }

  const messages = await getMessagesByChatId(chatId, userId);
  res.json(messages);
};

/**
 * UPDATE MESSAGE (edit encrypted text)
 */
export const updateMessage = async (req, res) => {
  const { encryptedPayload } = req.body;

  const msg = await Message.findById(req.params.id);
  if (!msg) return res.status(404).json({ message: "Message not found" });

  // Only the sender can edit
  if (msg.senderId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Only the sender can edit this message" });
  }

  msg.encryptedPayload = encryptedPayload;
  await msg.save();

  res.json({ message: "Message updated", data: msg });
};

/**
 * DELETE MESSAGE (with Cloudinary cleanup)
 */
export const deleteMessage = async (req, res) => {
  try {
    await deleteMessageById(req.params.id, req.user._id);
    res.json({ message: "Message deleted successfully" });
  } catch (err) {
    if (err.message === "Message not found") {
      return res.status(404).json({ message: err.message });
    }
    if (err.message.includes("Only the sender")) {
      return res.status(403).json({ message: err.message });
    }
    throw err;
  }
};

/**
 * SEND MEDIA MESSAGE (file upload → Cloudinary)
 */
export const sendMediaMessage = async (req, res) => {
  const { chatId, messageType, encryptedPayload } = req.body;
  const senderId = req.user._id;

  if (!req.file) {
    return res.status(400).json({ message: "File required" });
  }

  // Verify user is participant
  const chat = await Chat.findById(chatId);
  if (!chat) return res.status(404).json({ message: "Chat not found" });

  const isParticipant = chat.participants.some(
    (p) => p.toString() === senderId.toString()
  );
  if (!isParticipant) {
    return res.status(403).json({ message: "Access denied" });
  }

  // Determine message type from MIME if not provided
  let resolvedType = messageType || "image";
  if (!messageType) {
    if (req.file.mimetype.startsWith("image/")) resolvedType = "image";
    else if (req.file.mimetype.startsWith("video/")) resolvedType = "video";
    else if (req.file.mimetype.startsWith("audio/")) resolvedType = "audio";
    else resolvedType = "document";
  }

  // Upload to Cloudinary via service
  const message = await createMediaMessage(
    chatId,
    senderId,
    req.file,
    resolvedType,
    encryptedPayload
  );

  // Emit to receiver via socket
  const receiverId = chat.participants.find(
    (p) => p.toString() !== senderId.toString()
  );
  if (receiverId) {
    const receiverSocketId = getSocketId(receiverId.toString());
    if (receiverSocketId) {
      getIO().to(receiverSocketId).emit("new-message", message);
    }
  }

  res.status(201).json(message);
};
