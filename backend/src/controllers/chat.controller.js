import Chat from "../models/chat.model.js";
import {
  findOrCreateChat,
  getUserChats,
  deleteChatWithCleanup,
  deleteChatForMe,
} from "../services/chat.service.js";

//@desc CREATE CHAT (1-to-1)
export const createChat = async (req, res) => {
  const { participantId } = req.body;
  const currentUserId = req.user._id;

  if (!participantId) {
    return res.status(400).json({ message: "participantId is required" });
  }

  try {
    const { chat, created } = await findOrCreateChat(currentUserId, participantId);
    res.status(created ? 201 : 200).json(chat);
  } catch (err) {
    if (err.message.includes("yourself") || err.message.includes("Invalid")) {
      return res.status(400).json({ message: err.message });
    }
    throw err;
  }
};

//@desc get all chats for the authenicated user
export const getUserChatsController = async (req, res) => {
  const chats = await getUserChats(req.user._id);
  res.json(chats);
};

//@desc get chat by ID (verify user is participant)
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

// @desc delete chat 
// @desc: Query param: ?deleteType=me|everyone
// @desc: "me" — hides messages for this user only
// @desc: "everyone" — deletes chat + messages + media permanently
export const deleteChat = async (req, res) => {
  try {
    const deleteType = req.query.deleteType || "everyone";

    if (deleteType === "me") {
      const result = await deleteChatForMe(req.params.id, req.user._id);
      return res.json({ message: "Chat cleared for you", ...result });
    }

    const result = await deleteChatWithCleanup(req.params.id, req.user._id);
    res.json({ message: "Chat deleted successfully", ...result });
  } catch (err) {
    if (err.message === "Chat not found") {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === "Access denied") {
      return res.status(403).json({ message: err.message });
    }
    throw err;
  }
};
