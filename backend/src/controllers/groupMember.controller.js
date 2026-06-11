import GroupMember from "../models/groupMember.model.js";
import Group from "../models/group.model.js";
import Notification from "../models/notification.model.js";
import { getIO, getSocketId, emitToUser, emitToGroup } from "../sockets/socket.js";

// @desc add member to group
export const addMember = async (req, res) => {
  const { groupId, userId, role } = req.body;
  const inviterId = req.user._id;

  // Check if inviter is admin or creator
  const inviterMember = await GroupMember.findOne({ groupId, userId: inviterId });
  if (!inviterMember || (inviterMember.role !== "creator" && inviterMember.role !== "admin")) {
    return res.status(403).json({ message: "Only admins can add members" });
  }

  const exists = await GroupMember.findOne({ groupId, userId });
  if (exists) {
    return res.status(400).json({ message: "User already in group or invited" });
  }

  const group = await Group.findById(groupId);
  if (!group) return res.status(404).json({ message: "Group not found" });

  const member = await GroupMember.create({
    groupId,
    userId,
    role: role || "member",
    status: "accepted",
    invitedBy: inviterId
  });

  await member.populate("userId", "firstName lastName profileImage isOnline");

  // Emit Real-time socket event
  await emitToGroup(groupId.toString(), "memberAdded", member);

  const notification = await Notification.create({
    userId,
    type: "group_invite",
    title: "Group Invitation",
    body: `You have been added to ${group.groupName}`,
    data: { groupId, senderId: inviterId, groupName: group.groupName }
  });

  // Emit Real-time socket event
  const socketId = getSocketId(userId);
  if (socketId) {
    const io = getIO();
    io.to(socketId).emit("new-notification", notification);
  }

  res.status(201).json(member);
};

// @desc accept invite
export const acceptInvite = async (req, res) => {
  const { groupId } = req.body;

  const member = await GroupMember.findOneAndUpdate(
    { groupId, userId: req.user._id, status: "pending" },
    { status: "accepted" },
    { returnDocument: 'after' }
  );

  if (!member) {
    return res.status(404).json({ message: "Invitation not found or already processed" });
  }

  // Delete notification related to this invite
  await Notification.deleteMany({ userId: req.user._id, type: "group_invite", "data.groupId": groupId });

  res.json({ message: "Invitation accepted", member });
};

// @desc reject invite
export const rejectInvite = async (req, res) => {
  const { groupId } = req.body;

  await GroupMember.findOneAndDelete({ groupId, userId: req.user._id, status: "pending" });

  // Delete notification related to this invite
  await Notification.deleteMany({ userId: req.user._id, type: "group_invite", "data.groupId": groupId });

  res.json({ message: "Invitation rejected" });
};

// @desc get group members
export const getGroupMembers = async (req, res) => {
  const members = await GroupMember.find({
    groupId: req.params.groupId
  }).populate("userId", "firstName lastName profileImage isOnline");

  res.json(members);
};

// @desc update member role
export const updateMemberRole = async (req, res) => {
  const { role } = req.body;
  const memberId = req.params.id;

  if (!["admin", "member"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  const targetMember = await GroupMember.findById(memberId);
  if (!targetMember) return res.status(404).json({ message: "Member not found" });

  const requesterMember = await GroupMember.findOne({ groupId: targetMember.groupId, userId: req.user._id });
  if (!requesterMember || (requesterMember.role !== "creator" && requesterMember.role !== "admin")) {
    return res.status(403).json({ message: "Only admins or creators can manage roles" });
  }

  if (targetMember.role === "creator") {
    return res.status(400).json({ message: "Cannot change the group creator's role" });
  }
  if (requesterMember.role === "admin" && targetMember.role === "admin" && role === "member") {
    return res.status(403).json({ message: "Only the group creator can demote an admin" });
  }

  if (targetMember.role === role) {
    return res.json(targetMember);
  }

  targetMember.role = role;
  await targetMember.save();

  await targetMember.populate("userId", "firstName lastName profileImage isOnline");

  const event = role === "admin" ? "adminGranted" : "adminRevoked";
  await emitToGroup(targetMember.groupId.toString(), event, targetMember);

  res.json(targetMember);
};

// @desc remove member from group / leave group
export const removeMember = async (req, res) => {
  const memberId = req.params.id;

  const targetMember = await GroupMember.findById(memberId);
  if (!targetMember) return res.status(404).json({ message: "Member not found" });

  const isSelf = targetMember.userId.toString() === req.user._id.toString();

  if (!isSelf) {
    const requester = await GroupMember.findOne({ groupId: targetMember.groupId, userId: req.user._id });
    if (!requester || (requester.role !== "creator" && requester.role !== "admin")) {
      return res.status(403).json({ message: "Only admins can remove members" });
    }
    if (targetMember.role === "creator") {
      return res.status(403).json({ message: "Cannot remove creator" });
    }
    if (requester.role === "admin" && targetMember.role === "admin") {
      return res.status(403).json({ message: "Only the group creator can remove other admins" });
    }
  } else {
    if (targetMember.role === "creator") {
      return res.status(400).json({ message: "Creator cannot leave the group. Delete the group instead." });
    }
  }

  await GroupMember.findByIdAndDelete(memberId);

  await emitToGroup(targetMember.groupId.toString(), "memberRemoved", {
    groupId: targetMember.groupId,
    memberId: targetMember._id,
    userId: targetMember.userId
  });

  res.json({ message: "Member removed from group", memberId: targetMember._id, userId: targetMember.userId });
};
