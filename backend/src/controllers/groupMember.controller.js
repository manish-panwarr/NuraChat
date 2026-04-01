import GroupMember from "../models/groupMember.model.js";
import Group from "../models/group.model.js";
import Notification from "../models/notification.model.js";
import { getIO, getSocketId } from "../sockets/socket.js";

/**
 * ADD MEMBER TO GROUP (Creates Pending Invite)
 */
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

  const member = await GroupMember.create({
    groupId,
    userId,
    role: role || "member",
    status: "pending",
    invitedBy: inviterId
  });

  // Create Database Notification
  const notification = await Notification.create({
    userId,
    type: "group_invite",
    title: "Group Invitation",
    body: `You have been invited to join ${group.groupName}`,
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

/**
 * ACCEPT INVITE
 */
export const acceptInvite = async (req, res) => {
  const { groupId } = req.body;
  
  const member = await GroupMember.findOneAndUpdate(
    { groupId, userId: req.user._id, status: "pending" },
    { status: "accepted" },
    { new: true }
  );

  if (!member) {
    return res.status(404).json({ message: "Invitation not found or already processed" });
  }

  // Delete notification related to this invite
  await Notification.deleteMany({ userId: req.user._id, type: "group_invite", "data.groupId": groupId });

  res.json({ message: "Invitation accepted", member });
};

/**
 * REJECT INVITE
 */
export const rejectInvite = async (req, res) => {
  const { groupId } = req.body;
  
  await GroupMember.findOneAndDelete({ groupId, userId: req.user._id, status: "pending" });
  
  // Delete notification related to this invite
  await Notification.deleteMany({ userId: req.user._id, type: "group_invite", "data.groupId": groupId });

  res.json({ message: "Invitation rejected" });
};

/**
 * GET ALL MEMBERS OF A GROUP
 */
export const getGroupMembers = async (req, res) => {
  const members = await GroupMember.find({
    groupId: req.params.groupId
  }).populate("userId", "firstName lastName profileImage isOnline");

  res.json(members);
};

/**
 * UPDATE MEMBER ROLE (creator/admin only)
 */
export const updateMemberRole = async (req, res) => {
  const { role } = req.body;
  const memberId = req.params.id; // GroupMember _id

  const targetMember = await GroupMember.findById(memberId);
  if (!targetMember) return res.status(404).json({ message: "Member not found" });

  const inviterMember = await GroupMember.findOne({ groupId: targetMember.groupId, userId: req.user._id });
  if (!inviterMember || inviterMember.role !== "creator") {
    // Only creator can promote/demote admins for simplicity right now
    if (inviterMember?.role !== "admin" || role === "creator") {
      return res.status(403).json({ message: "Insufficient privileges" });
    }
  }

  targetMember.role = role;
  await targetMember.save();

  res.json(targetMember);
};

/**
 * REMOVE MEMBER FROM GROUP / LEAVE GROUP
 */
export const removeMember = async (req, res) => {
  const memberId = req.params.id; // GroupMember _id

  const targetMember = await GroupMember.findById(memberId);
  if (!targetMember) return res.status(404).json({ message: "Member not found" });

  // Self-leave logic -> users can always remove themselves
  if (targetMember.userId.toString() !== req.user._id.toString()) {
    // If not self, check if requester is admin/creator
    const requester = await GroupMember.findOne({ groupId: targetMember.groupId, userId: req.user._id });
    if (!requester || (requester.role !== "creator" && requester.role !== "admin")) {
      return res.status(403).json({ message: "Only admins can remove members" });
    }
    // Prevent admin from removing creator
    if (targetMember.role === "creator") {
        return res.status(403).json({ message: "Cannot remove creator" });
    }
  }

  await GroupMember.findByIdAndDelete(memberId);
  res.json({ message: "Member removed from group" });
};
