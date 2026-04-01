import Chat from "../models/chat.model.js";
import Message from "../models/message.model.js";
import mongoose from "mongoose";
import { deleteMultipleFromCloudinary } from "./cloudinary.service.js";

const POPULATE_FIELDS = "firstName lastName email profileImage isOnline lastSeen statusText";

/**
 * Find an existing chat between two users or create a new one
 */
export const findOrCreateChat = async (userId, participantId) => {
    if (participantId === userId.toString()) {
        throw new Error("Cannot create chat with yourself");
    }

    let participantObjectId;
    try {
        participantObjectId = new mongoose.Types.ObjectId(participantId);
    } catch {
        throw new Error("Invalid participantId format");
    }

    const participants = [userId, participantObjectId];

    // Check if chat already exists
    const existing = await Chat.findOne({
        participants: { $all: participants, $size: 2 },
    })
        .populate("participants", POPULATE_FIELDS)
        .populate("lastMessageId");

    if (existing) return { chat: existing, created: false };

    const chat = await Chat.create({ participants });

    const populated = await Chat.findById(chat._id)
        .populate("participants", POPULATE_FIELDS)
        .populate("lastMessageId");

    return { chat: populated, created: true };
};

/**
 * Get all chats for a user, sorted by most recent
 */
export const getUserChats = async (userId) => {
    return Chat.find({ participants: userId })
        .populate("participants", POPULATE_FIELDS)
        .populate("lastMessageId")
        .sort({ updatedAt: -1 });
};

/**
 * Delete a chat with full Cloudinary media cleanup
 * 1. Find all messages with media
 * 2. Extract Cloudinary public IDs
 * 3. Batch delete from Cloudinary
 * 4. Delete all messages
 * 5. Delete the chat
 */
export const deleteChatWithCleanup = async (chatId, userId) => {
    const chat = await Chat.findById(chatId);
    if (!chat) throw new Error("Chat not found");

    const isParticipant = chat.participants.some(
        (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) throw new Error("Access denied");

    // Find all messages with Cloudinary media
    const mediaMessages = await Message.find({
        chatId,
        cloudinaryPublicId: { $ne: null },
    });

    // Batch delete from Cloudinary
    if (mediaMessages.length > 0) {
        const items = mediaMessages.map((msg) => ({
            publicId: msg.cloudinaryPublicId,
            resourceType: msg.mediaMeta?.resourceType || "image",
        }));

        try {
            await deleteMultipleFromCloudinary(items);
        } catch (err) {
            console.error("Cloudinary batch cleanup error:", err);
            // Continue with deletion even if Cloudinary cleanup fails
        }
    }

    // Delete all messages in this chat
    await Message.deleteMany({ chatId });

    // Delete the chat document
    await Chat.findByIdAndDelete(chatId);

    return { deletedMediaCount: mediaMessages.length };
};

/**
 * Delete chat "for me" — adds userId to deletedFor on all messages
 * The chat itself remains, messages still exist but are hidden for this user
 */
export const deleteChatForMe = async (chatId, userId) => {
    const chat = await Chat.findById(chatId);
    if (!chat) throw new Error("Chat not found");

    const isParticipant = chat.participants.some(
        (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) throw new Error("Access denied");

    // Add userId to deletedFor on all messages in this chat
    await Message.updateMany(
        { chatId, deletedFor: { $ne: userId } },
        { $addToSet: { deletedFor: userId } }
    );

    return { hiddenForUser: true };
};
