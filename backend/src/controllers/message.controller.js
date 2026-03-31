import Message from "../models/message.model.js";
import Chat from "../models/chat.model.js";
import { getIO, getSocketId } from "../sockets/socket.js";

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

  const saved = await Message.create({
    chatId,
    senderId,
    messageType: messageType || "text",
    encryptedPayload,
  });

  // Update chat's last message and bump updatedAt
  await Chat.findByIdAndUpdate(chatId, {
    lastMessageId: saved._id,
    updatedAt: new Date(),
  });

  // Populate sender for the response
  await saved.populate("senderId", "firstName lastName profileImage isOnline");

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

  const messages = await Message.find({ chatId })
    .populate("senderId", "firstName lastName profileImage isOnline")
    .sort({ createdAt: 1 });

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
 * DELETE MESSAGE
 */
export const deleteMessage = async (req, res) => {
  const msg = await Message.findById(req.params.id);
  if (!msg) return res.status(404).json({ message: "Message not found" });

  // Only the sender can delete
  if (msg.senderId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Only the sender can delete this message" });
  }

  await Message.findByIdAndDelete(req.params.id);
  res.json({ message: "Message deleted successfully" });
};

/**
 * SEND MEDIA MESSAGE (file upload)
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

  // Construct local URL
  const fileUrl = `/uploads/chat-media/${req.file.filename}`;

  const message = await Message.create({
    chatId,
    senderId,
    messageType: messageType || "image",
    mediaUrl: fileUrl,
    encryptedPayload: encryptedPayload || "",
    mediaMeta: {
      format: req.file.mimetype,
      bytes: req.file.size,
    },
  });

  // Update chat
  await Chat.findByIdAndUpdate(chatId, {
    lastMessageId: message._id,
    updatedAt: new Date(),
  });

  // Populate and emit
  await message.populate("senderId", "firstName lastName profileImage isOnline");

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
