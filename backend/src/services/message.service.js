import Message from "../models/message.model.js";
import Chat from "../models/chat.model.js";
import { uploadToCloudinary, deleteFromCloudinary } from "./cloudinary.service.js";

/**
 * Create a text message
 */
export const createTextMessage = async (chatId, senderId, encryptedPayload, messageType = "text") => {
    const message = await Message.create({
        chatId,
        senderId,
        messageType,
        encryptedPayload,
    });

    // Update chat's last message
    await Chat.findByIdAndUpdate(chatId, {
        lastMessageId: message._id,
        updatedAt: new Date(),
    });

    // Populate sender info
    await message.populate("senderId", "firstName lastName profileImage isOnline");

    return message;
};

/**
 * Create a media message — uploads to Cloudinary
 * @param {string} chatId
 * @param {string} senderId
 * @param {object} file - multer file object { buffer, mimetype, originalname, size }
 * @param {string} messageType - 'image', 'video', 'document', 'audio'
 * @param {string} encryptedPayload - optional caption
 */
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

    // Update chat's last message
    await Chat.findByIdAndUpdate(chatId, {
        lastMessageId: message._id,
        updatedAt: new Date(),
    });

    // Populate sender info
    await message.populate("senderId", "firstName lastName profileImage isOnline");

    return message;
};

/**
 * Get all messages for a chat, sorted chronologically
 * Filters out messages deleted for the requesting user
 */
export const getMessagesByChatId = async (chatId, userId) => {
    const filter = { chatId };
    if (userId) {
        filter.deletedFor = { $ne: userId };
    }
    return Message.find(filter)
        .populate("senderId", "firstName lastName profileImage isOnline")
        .sort({ createdAt: 1 });
};

/**
 * Delete a message by ID (with optional Cloudinary cleanup)
 */
export const deleteMessageById = async (messageId, userId) => {
    const msg = await Message.findById(messageId);
    if (!msg) throw new Error("Message not found");

    if (msg.senderId.toString() !== userId.toString()) {
        throw new Error("Only the sender can delete this message");
    }

    // Clean up Cloudinary asset if it's a media message
    if (msg.cloudinaryPublicId) {
        const resourceType = msg.mediaMeta?.resourceType || "image";
        try {
            await deleteFromCloudinary(msg.cloudinaryPublicId, resourceType);
        } catch (err) {
            console.error("Failed to delete Cloudinary asset:", err);
            // Continue with message deletion even if Cloudinary cleanup fails
        }
    }

    await Message.findByIdAndDelete(messageId);
    return msg;
};
