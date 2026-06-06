import Message from "../models/message.model.js";
import Chat from "../models/chat.model.js";
import { uploadToCloudinary, deleteFromCloudinary } from "./cloudinary.service.js";

//@desc: create text message
export const createTextMessage = async (chatId, senderId, encryptedPayload, messageType = "text") => {
    const message = await Message.create({
        chatId,
        senderId,
        messageType,
        encryptedPayload,
    });

    await Chat.findByIdAndUpdate(chatId, {
        lastMessageId: message._id,
        updatedAt: new Date(),
        $set: { deletedFor: [] }
    });

    await message.populate("senderId", "firstName lastName profileImage isOnline");

    return message;
};

//@desc : create media message
export const createMediaMessage = async (chatId, senderId, file, messageType, encryptedPayload = "") => {
    // Upload to Cloudinary
    const cloudResult = await uploadToCloudinary(file.buffer, file.mimetype, {
        folder: `nurachat/chat-media/${chatId}`,
    });

    const message = await Message.create({
        chatId,
        senderId,
        messageType,
        mediaUrl: cloudResult.url,
        cloudinaryPublicId: cloudResult.publicId,
        encryptedPayload: encryptedPayload || "",
        mediaMeta: {
            format: file.mimetype,
            bytes: cloudResult.bytes || file.size,
            width: cloudResult.width,
            height: cloudResult.height,
            duration: cloudResult.duration,
            originalName: file.originalname,
            resourceType: cloudResult.resourceType,
        },
    });

    await Chat.findByIdAndUpdate(chatId, {
        lastMessageId: message._id,
        updatedAt: new Date(),
        $set: { deletedFor: [] }
    });
    await message.populate("senderId", "firstName lastName profileImage isOnline");

    return message;
};

//@desc: get all messages for a chat, sorted chronologically
export const getMessagesByChatId = async (chatId, userId) => {
    const filter = { chatId };
    if (userId) {
        filter.deletedFor = { $ne: userId };
    }
    return Message.find(filter)
        .populate("senderId", "firstName lastName profileImage isOnline")
        .sort({ createdAt: 1 });
};

//@desc : delete message by ID
export const deleteMessageById = async (messageId, userId) => {
    const msg = await Message.findById(messageId);
    if (!msg) throw new Error("Message not found");

    if (msg.senderId.toString() !== userId.toString()) {
        throw new Error("Only the sender can delete this message");
    }

    if (msg.cloudinaryPublicId) {
        const resourceType = msg.mediaMeta?.resourceType || "image";
        try {
            await deleteFromCloudinary(msg.cloudinaryPublicId, resourceType);
        } catch (err) {
            console.error("Failed to delete Cloudinary asset:", err);
        }
    }

    await Message.findByIdAndDelete(messageId);
    return msg;
};
