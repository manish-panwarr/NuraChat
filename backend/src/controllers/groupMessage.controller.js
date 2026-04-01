import cloudinary from "../config/cloudinary.js";
import Message from "../models/message.model.js";
import GroupMember from "../models/groupMember.model.js";
import { getIO, getSocketId } from "../sockets/socket.js";

/**
 * SEND GROUP MESSAGE (TEXT OR MEDIA)
 */
export const sendGroupMessage = async (req, res) => {
  try {
    const { groupId, messageType, encryptedPayload } = req.body;
    const senderId = req.user._id;

    // 🔒 Check membership (must be accepted creator, admin, or member)
    const member = await GroupMember.findOne({
      groupId,
      userId: senderId,
      status: "accepted"
    });

    if (!member) {
      return res.status(403).json({ message: "You are not an active member of this group" });
    }

    if (!encryptedPayload) {
      return res.status(400).json({ message: "Payload is required" });
    }

    const payload = {
      groupId,
      senderId,
      messageType: messageType || "text",
      encryptedPayload
    };

    const savedMessage = await Message.create(payload);
    
    // Populate sender info for the socket event
    await savedMessage.populate("senderId", "firstName lastName profileImage");

    // 🌐 EMIT TO ALL GROUP MEMBERS
    // We find all accepted members of this group
    const members = await GroupMember.find({ groupId, status: "accepted" });
    const io = getIO();
    
    members.forEach(m => {
      // Don't echo back to sender here; frontend handles optimistic UI
      if (m.userId.toString() !== senderId.toString()) {
        const memberSocketId = getSocketId(m.userId.toString());
        if (memberSocketId) {
          io.to(memberSocketId).emit("new-group-message", savedMessage);
        }
      }
    });

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
    const { groupId } = req.params;
    const userId = req.user._id;

    // 🔒 Check membership
    const member = await GroupMember.findOne({
      groupId,
      userId,
      status: "accepted"
    });

    if (!member) {
      return res.status(403).json({ message: "You are not an active member of this group" });
    }

    const messages = await Message.find({ groupId })
      .populate("senderId", "firstName lastName profileImage isOnline")
      .sort({ createdAt: 1 });

    res.json(messages);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch group messages" });
  }
};

/**
 * SEND GROUP MEDIA MESSAGE
 */
export const sendGroupMediaMessage = async (req, res) => {
  try {
    const { groupId, messageType, encryptedPayload } = req.body;
    const senderId = req.user._id;

    if (!req.file) {
      return res.status(400).json({ message: "Media file is required" });
    }

    // 🔒 Check membership
    const member = await GroupMember.findOne({
      groupId,
      userId: senderId,
      status: "accepted"
    });

    if (!member) {
      return res.status(403).json({ message: "You are not an active member of this group" });
    }

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "auto"
    });

    let resolvedType = messageType || "image";
    if (!messageType) {
      if (req.file.mimetype.startsWith("image/")) resolvedType = "image";
      else if (req.file.mimetype.startsWith("video/")) resolvedType = "video";
      else if (req.file.mimetype.startsWith("audio/")) resolvedType = "audio";
      else resolvedType = "document";
    }

    const payload = {
      groupId,
      senderId,
      messageType: resolvedType,
      encryptedPayload, // Optional caption
      mediaUrl: uploadResult.secure_url,
      mediaMeta: {
        public_id: uploadResult.public_id,
        format: uploadResult.format,
        bytes: uploadResult.bytes
      }
    };

    const savedMessage = await Message.create(payload);
    await savedMessage.populate("senderId", "firstName lastName profileImage");

    // 🌐 EMIT TO ALL GROUP MEMBERS
    const members = await GroupMember.find({ groupId, status: "accepted" });
    const io = getIO();
    
    members.forEach(m => {
      if (m.userId.toString() !== senderId.toString()) {
        const memberSocketId = getSocketId(m.userId.toString());
        if (memberSocketId) {
          io.to(memberSocketId).emit("new-group-message", savedMessage);
        }
      }
    });

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
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    // In groups, only sender or group admins can delete
    if (msg.senderId.toString() !== req.user._id.toString()) {
      const member = await GroupMember.findOne({ groupId: msg.groupId, userId: req.user._id });
      if (!member || (member.role !== "admin" && member.role !== "creator")) {
        return res.status(403).json({ message: "Only sender or admin can delete this message" });
      }
    }

    await Message.findByIdAndDelete(req.params.id);
    res.json({ message: "Group message deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete message" });
  }
};
