import Message from "../models/message.model.js";
import GroupMember from "../models/groupMember.model.js";
import { getIO, getSocketId, emitToUser, emitToGroup } from "../sockets/socket.js";
import { uploadToCloudinary } from "../services/cloudinary.service.js";

// @desc send group message
export const sendGroupMessage = async (req, res) => {
  try {
    const { groupId, messageType, encryptedPayload } = req.body;
    const senderId = req.user._id;

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

    await savedMessage.populate("senderId", "firstName lastName profileImage");

    const members = await GroupMember.find({ groupId, status: "accepted" });
    const io = getIO();

    members.forEach(m => {
      emitToUser(m.userId.toString(), "new-group-message", savedMessage);
    });

    res.status(201).json(savedMessage);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send group message" });
  }
};

// @desc get group messages
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const member = await GroupMember.findOne({
      groupId,
      userId,
      status: "accepted"
    });

    if (!member) {
      return res.status(403).json({ message: "You are not an active member of this group" });
    }

    const messages = await Message.find({ groupId, deletedFor: { $ne: userId } })
      .populate("senderId", "firstName lastName profileImage isOnline")
      .sort({ createdAt: 1 });

    res.json(messages);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch group messages" });
  }
};

// @desc send group media message
export const sendGroupMediaMessage = async (req, res) => {
  try {
    const { groupId, messageType, encryptedPayload } = req.body;
    const senderId = req.user._id;

    if (!req.file) {
      return res.status(400).json({ message: "Media file is required" });
    }

    const member = await GroupMember.findOne({
      groupId,
      userId: senderId,
      status: "accepted"
    });

    if (!member) {
      return res.status(403).json({ message: "You are not an active member of this group" });
    }

    const uploadResult = await uploadToCloudinary(req.file.buffer, req.file.mimetype, {
      folder: `nurachat/group-media/${groupId}`
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
      encryptedPayload,
      mediaUrl: uploadResult.url,
      cloudinaryPublicId: uploadResult.publicId,
      mediaMeta: {
        format: uploadResult.format,
        bytes: uploadResult.bytes
      }
    };

    const savedMessage = await Message.create(payload);
    await savedMessage.populate("senderId", "firstName lastName profileImage");

    const members = await GroupMember.find({ groupId, status: "accepted" });
    const io = getIO();

    members.forEach(m => {
      emitToUser(m.userId.toString(), "new-group-message", savedMessage);
    });

    res.status(201).json(savedMessage);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send group media message" });
  }
};

// @desc delete group message
export const deleteGroupMessage = async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: "Message not found" });

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
