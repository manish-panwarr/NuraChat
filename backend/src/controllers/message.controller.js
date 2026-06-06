import Message from "../models/message.model.js";
import Chat from "../models/chat.model.js";
import { getIO, getSocketId, emitToUser, emitToGroup } from "../sockets/socket.js";
import {
  createTextMessage,
  createMediaMessage,
  getMessagesByChatId,
  deleteMessageById,
} from "../services/message.service.js";

//@desc send text message
export const sendMessage = async (req, res) => {
  const { chatId, messageType, encryptedPayload } = req.body;
  const senderId = req.user._id;

  if (!chatId || !encryptedPayload) {
    return res.status(400).json({ message: "chatId and encryptedPayload are required" });
  }

  const chat = await Chat.findById(chatId);
  if (!chat) return res.status(404).json({ message: "Chat not found" });

  const isParticipant = chat.participants.some(
    (p) => p.toString() === senderId.toString()
  );
  if (!isParticipant) {
    return res.status(403).json({ message: "Access denied" });
  }

  const saved = await createTextMessage(chatId, senderId, encryptedPayload, messageType || "text");

  const receiverId = chat.participants.find(
    (p) => p.toString() !== senderId.toString()
  );
  if (receiverId) {
    emitToUser(receiverId.toString(), "new-message", saved);
  }

  emitToUser(senderId.toString(), "new-message", saved);

  res.status(201).json(saved);
};

//@desc get messages by chat id
export const getMessagesByChat = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user._id;
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

//@desc update message
export const updateMessage = async (req, res) => {
  const { encryptedPayload } = req.body;

  const msg = await Message.findById(req.params.id);
  if (!msg) return res.status(404).json({ message: "Message not found" });

  if (msg.senderId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Only the sender can edit this message" });
  }

  msg.encryptedPayload = encryptedPayload;
  msg.isEdited = true;
  await msg.save();
  await msg.populate("senderId", "firstName lastName profileImage isOnline");

  if (msg.groupId) {
    await emitToGroup(msg.groupId.toString(), "messageEdited", msg);
  } else {
    const chat = await Chat.findById(msg.chatId);
    if (chat) {
      chat.participants.forEach((p) => {
        emitToUser(p.toString(), "messageEdited", msg);
      });
    }
  }

  res.json({ message: "Message updated", data: msg });
};

//@desc delete message for me
export const deleteMessageForMe = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    await Message.findByIdAndUpdate(id, { $addToSet: { deletedFor: userId } });

    emitToUser(userId.toString(), "messageDeletedForUser", { messageId: id, chatId: msg.chatId, groupId: msg.groupId });

    res.json({ message: "Message deleted for you", messageId: id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete message for me" });
  }
};

//@desc delete messages for me 
export const deleteMessagesForMeBatch = async (req, res) => {
  try {
    const { messageIds } = req.body;
    const userId = req.user._id;

    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({ message: "messageIds array is required" });
    }

    await Message.updateMany(
      { _id: { $in: messageIds } },
      { $addToSet: { deletedFor: userId } }
    );

    emitToUser(userId.toString(), "messagesDeletedForUser", { messageIds });

    res.json({ message: "Messages deleted for you successfully", messageIds });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete messages for me" });
  }
};

//@desc clear chat
export const clearChat = async (req, res) => {
  try {
    const { chatId, groupId } = req.body;
    const userId = req.user._id;

    if (!chatId && !groupId) {
      return res.status(400).json({ message: "Either chatId or groupId is required" });
    }

    const query = {};
    if (chatId) {
      query.chatId = chatId;
    } else {
      query.groupId = groupId;
    }

    await Message.updateMany(
      { ...query, deletedFor: { $ne: userId } },
      { $addToSet: { deletedFor: userId } }
    );

    emitToUser(userId.toString(), "chatClearedForUser", { chatId, groupId });

    res.json({ message: "Chat cleared successfully", chatId, groupId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to clear chat" });
  }
};

//@desc delete message
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

//@desc send media message
export const sendMediaMessage = async (req, res) => {
  const { chatId, messageType, encryptedPayload } = req.body;
  const senderId = req.user._id;

  if (!req.file) {
    return res.status(400).json({ message: "File required" });
  }

  const chat = await Chat.findById(chatId);
  if (!chat) return res.status(404).json({ message: "Chat not found" });

  const isParticipant = chat.participants.some(
    (p) => p.toString() === senderId.toString()
  );
  if (!isParticipant) {
    return res.status(403).json({ message: "Access denied" });
  }

  let resolvedType = messageType || "image";
  if (!messageType) {
    if (req.file.mimetype.startsWith("image/")) resolvedType = "image";
    else if (req.file.mimetype.startsWith("video/")) resolvedType = "video";
    else if (req.file.mimetype.startsWith("audio/")) resolvedType = "audio";
    else resolvedType = "document";
  }

  const message = await createMediaMessage(
    chatId,
    senderId,
    req.file,
    resolvedType,
    encryptedPayload
  );

  const receiverId = chat.participants.find(
    (p) => p.toString() !== senderId.toString()
  );
  if (receiverId) {
    emitToUser(receiverId.toString(), "new-message", message);
  }
  emitToUser(senderId.toString(), "new-message", message);

  res.status(201).json(message);
};
