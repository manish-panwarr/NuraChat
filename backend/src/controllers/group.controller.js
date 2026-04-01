import Group from "../models/group.model.js";
import GroupMember from "../models/groupMember.model.js";
import crypto from "crypto";

export const createGroup = async (req, res) => {
  const { groupName, description } = req.body;
  const createdBy = req.user._id;

  if (!groupName) {
    return res.status(400).json({ message: "groupName is required" });
  }

  // Generate a random strong encryption salt for the group
  const encryptionSalt = crypto.randomBytes(16).toString("hex");

  const group = await Group.create({
    groupName,
    description: description || "",
    encryptionSalt,
    createdBy
  });

  // Creator is automatically accepted and assigned the "creator" role
  await GroupMember.create({
    groupId: group._id,
    userId: createdBy,
    role: "creator",
    status: "accepted"
  });

  res.status(201).json(group);
};

export const getMyGroups = async (req, res) => {
  // Find all group memberships where the user is accepted
  const memberships = await GroupMember.find({ 
    userId: req.user._id,
    status: "accepted"
  });
  
  const groupIds = memberships.map(m => m.groupId);

  const groups = await Group.find({ _id: { $in: groupIds } })
    .populate("createdBy", "firstName lastName profileImage");
    
  res.json(groups);
};

export const getGroupById = async (req, res) => {
  const group = await Group.findById(req.params.id)
    .populate("createdBy", "firstName lastName profileImage");

  if (!group) {
    return res.status(404).json({ message: "Group not found" });
  }

  // Check if requesting user is at least a member/pending
  const isMember = await GroupMember.findOne({
    groupId: group._id,
    userId: req.user._id
  });

  if (!isMember) {
    return res.status(403).json({ message: "Access denied" });
  }

  res.json(group);
};

export const updateGroup = async (req, res) => {
  const { groupName, description, groupAvatar, encryptionSalt } = req.body;
  
  const group = await Group.findById(req.params.id);
  if (!group) {
    return res.status(404).json({ message: "Group not found" });
  }

  // Check roles
  const me = await GroupMember.findOne({ groupId: group._id, userId: req.user._id });
  if (!me || (me.role !== "creator" && me.role !== "admin")) {
    return res.status(403).json({ message: "Only an admin or creator can update the group" });
  }

  if (encryptionSalt && me.role !== "creator") {
    return res.status(403).json({ message: "Only the creator can reset the encryption salt" });
  }

  const updates = {};
  if (groupName !== undefined) updates.groupName = groupName;
  if (description !== undefined) updates.description = description;
  if (groupAvatar !== undefined) updates.groupAvatar = groupAvatar;
  if (encryptionSalt) updates.encryptionSalt = encryptionSalt; // Should trigger re-encryption in service, handled separately later

  const updatedGroup = await Group.findByIdAndUpdate(
    req.params.id,
    updates,
    { returnDocument: 'after' }
  );

  res.json(updatedGroup);
};

export const deleteGroup = async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) return res.status(404).json({ message: "Group not found" });

  const me = await GroupMember.findOne({ groupId: group._id, userId: req.user._id });
  if (!me || me.role !== "creator") {
    return res.status(403).json({ message: "Only the creator can delete the group" });
  }

  await Group.findByIdAndDelete(req.params.id);

  // cleanup members
  await GroupMember.deleteMany({ groupId: req.params.id });

  res.json({ message: "Group deleted successfully" });
};
