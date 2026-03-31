import Chat from "../models/chat.model.js";
import Message from "../models/message.model.js";
import mongoose from "mongoose";

/**
 * CREATE CHAT (1-to-1)
 * Accepts { participantId } from body, uses req.user._id as the other participant.
 * Returns existing chat if one already exists between the two users.
 */
export const createChat = async (req, res) => {
  const { participantId } = req.body;
  const currentUserId = req.user._id;

  if (!participantId) {
    return res.status(400).json({ message: "participantId is required" });
  }

  if (participantId === currentUserId.toString()) {
    return res.status(400).json({ message: "Cannot create chat with yourself" });
  }

  let participantObjectId;
  try {
      participantObjectId = new mongoose.Types.ObjectId(participantId);
  } catch(e) {
      return res.status(400).json({ message: "Invalid participantId format" });
  }

  const participants = [currentUserId, participantObjectId];

  // Check if chat already exists between these two users
  const existing = await Chat.findOne({
    participants: { $all: participants, $size: 2 },
  })
    .populate("participants", "firstName lastName email profileImage isOnline lastSeen statusText")
    .populate("lastMessageId");

  if (existing) return res.json(existing);

  const chat = await Chat.create({ participants });

  // Return populated version
  const populated = await Chat.findById(chat._id)
    .populate("participants", "firstName lastName email profileImage isOnline lastSeen statusText")
    .populate("lastMessageId");

  res.status(201).json(populated);
};

/**
 * GET ALL CHATS for the authenticated user
 */
export const getUserChats = async (req, res) => {
  const userId = req.user._id;

  const chats = await Chat.find({ participants: userId })
    .populate("participants", "firstName lastName email profileImage isOnline lastSeen statusText")
    .populate("lastMessageId")
    .sort({ updatedAt: -1 });

  res.json(chats);
};

/**
 * GET CHAT BY ID (verify user is participant)
 */
export const getChatById = async (req, res) => {
  const chat = await Chat.findById(req.params.id)
    .populate("participants", "firstName lastName email profileImage isOnline lastSeen statusText")
    .populate("lastMessageId");

  if (!chat) return res.status(404).json({ message: "Chat not found" });

  // Verify the requesting user is a participant
  const isParticipant = chat.participants.some(
    (p) => p._id.toString() === req.user._id.toString()
  );
  if (!isParticipant) {
    return res.status(403).json({ message: "Access denied" });
  }

  res.json(chat);
};

/**
 * DELETE CHAT (and all its messages)
 */
export const deleteChat = async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) return res.status(404).json({ message: "Chat not found" });

  // Verify the requesting user is a participant
  const isParticipant = chat.participants.some(
    (p) => p.toString() === req.user._id.toString()
  );
  if (!isParticipant) {
    return res.status(403).json({ message: "Access denied" });
  }

  // Delete all messages in this chat
  await Message.deleteMany({ chatId: chat._id });
  await Chat.findByIdAndDelete(req.params.id);

  res.json({ message: "Chat deleted successfully" });
};
