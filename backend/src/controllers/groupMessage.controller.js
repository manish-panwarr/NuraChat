import cloudinary from "../config/cloudinary.js";
import Message from "../models/message.model.js";
import GroupMember from "../models/groupMember.model.js";
import { encryptText, decryptText } from "../services/encryption.service.js";

/**
 * SEND GROUP MESSAGE (TEXT OR MEDIA)
 */
export const sendGroupMessage = async (req, res) => {
  try {
    const { groupId, senderId, messageType, message } = req.body;

    // 🔒 Check membership
    const member = await GroupMember.findOne({
      groupId,
      userId: senderId
    });

    if (!member) {
      return res.status(403).json({ message: "User not in group" });
    }

    let payload = {
      groupId,
      senderId,
      messageType
    };

    // 📝 TEXT MESSAGE
    if (messageType === "text") {
      if (!message) {
        return res.status(400).json({ message: "Message text is required" });
      }

      const encrypted = encryptText(message);
      payload.encryptedPayload = JSON.stringify(encrypted);
    }

    // 🖼️ MEDIA MESSAGE
    if (messageType === "image" || messageType === "video" || messageType === "file") {
      if (!req.file) {
        return res.status(400).json({ message: "Media file is required" });
      }

      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "auto"
      });

      payload.mediaUrl = uploadResult.secure_url;
      payload.mediaMeta = {
        public_id: uploadResult.public_id,
        format: uploadResult.format,
        bytes: uploadResult.bytes
      };
    }

    const savedMessage = await Message.create(payload);
    res.status(201).json(savedMessage);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send group message" });
  }
};

/**
 * GET GROUP MESSAGES
 */
export const getGroupMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      groupId: req.params.groupId
    }).sort({ createdAt: 1 });

    const formatted = messages.map(msg => {
      let decryptedMessage = null;

      if (msg.messageType === "text" && msg.encryptedPayload) {
        decryptedMessage = decryptText(
          JSON.parse(msg.encryptedPayload)
        );
      }

      return {
        _id: msg._id,
        groupId: msg.groupId,
        senderId: msg.senderId,
        messageType: msg.messageType,
        message: decryptedMessage,
        mediaUrl: msg.mediaUrl || null,
        mediaMeta: msg.mediaMeta || null,
        createdAt: msg.createdAt
      };
    });

    res.json(formatted);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch group messages" });
  }
};

/**
 * UPDATE GROUP TEXT MESSAGE
 */
export const updateGroupMessage = async (req, res) => {
  try {
    const { message } = req.body;

    const encrypted = encryptText(message);

    const updated = await Message.findByIdAndUpdate(
      req.params.id,
      { encryptedPayload: JSON.stringify(encrypted) },
      { returnDocument: 'after' }
    );

    res.json({
      message: "Group message updated",
      data: updated
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update message" });
  }
};

/**
 * SEND GROUP MEDIA MESSAGE
 */
export const sendGroupMediaMessage = async (req, res) => {
  try {
    const { groupId, senderId, messageType } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Media file is required" });
    }

    // 🔒 Check membership
    const member = await GroupMember.findOne({
      groupId,
      userId: senderId
    });

    if (!member) {
      return res.status(403).json({ message: "User not in group" });
    }

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "auto"
    });

    const payload = {
      groupId,
      senderId,
      messageType: messageType || "image", // default to image if not specified
      mediaUrl: uploadResult.secure_url,
      mediaMeta: {
        public_id: uploadResult.public_id,
        format: uploadResult.format,
        bytes: uploadResult.bytes
      }
    };

    const savedMessage = await Message.create(payload);
    res.status(201).json(savedMessage);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send group media message" });
  }
};

/**
 * DELETE GROUP MESSAGE
 */
export const deleteGroupMessage = async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ message: "Group message deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete message" });
  }
};
