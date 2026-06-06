import Chat from "../models/chat.model.js";
import Message from "../models/message.model.js";
import mongoose from "mongoose";
import { deleteMultipleFromCloudinary } from "./cloudinary.service.js";

const POPULATE_FIELDS = "firstName lastName email profileImage isOnline lastSeen statusText";

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

// @desc : get user chats
export const getUserChats = async (userId) => {
    return Chat.find({ participants: userId, deletedFor: { $ne: userId } })
        .populate("participants", POPULATE_FIELDS)
        .populate("lastMessageId")
        .sort({ updatedAt: -1 });
};

//@desc : delete chat with cleanup
export const deleteChatWithCleanup = async (chatId, userId) => {
    const chat = await Chat.findById(chatId);
    if (!chat) throw new Error("Chat not found");

    const isParticipant = chat.participants.some(
        (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) throw new Error("Access denied");

    const mediaMessages = await Message.find({
        chatId,
        cloudinaryPublicId: { $ne: null },
    });
    if (mediaMessages.length > 0) {
        const items = mediaMessages.map((msg) => ({
            publicId: msg.cloudinaryPublicId,
            resourceType: msg.mediaMeta?.resourceType || "image",
        }));

        try {
            await deleteMultipleFromCloudinary(items);
        } catch (err) {
            console.error("Cloudinary batch cleanup error:", err);
        }
    }

    await Message.deleteMany({ chatId });

    await Chat.findByIdAndDelete(chatId);

    return { deletedMediaCount: mediaMessages.length };
};

//@desc : delete chat for me
export const deleteChatForMe = async (chatId, userId) => {
    const chat = await Chat.findById(chatId);
    if (!chat) throw new Error("Chat not found");

    const isParticipant = chat.participants.some(
        (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) throw new Error("Access denied");

    await Chat.findByIdAndUpdate(chatId, { $addToSet: { deletedFor: userId } });

    await Message.updateMany(
        { chatId, deletedFor: { $ne: userId } },
        { $addToSet: { deletedFor: userId } }
    );

    return { hiddenForUser: true };
};
