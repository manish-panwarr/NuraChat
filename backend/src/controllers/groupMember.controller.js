import GroupMember from "../models/groupMember.model.js";

/**
 * ADD MEMBER TO GROUP
 */
export const addMember = async (req, res) => {
  const { groupId, userId, role } = req.body;

  const exists = await GroupMember.findOne({ groupId, userId });
  if (exists) {
    return res.status(400).json({ message: "User already in group" });
  }

  const member = await GroupMember.create({
    groupId,
    userId,
    role: role || "member"
  });

  res.status(201).json(member);
};

/**
 * GET ALL MEMBERS OF A GROUP
 */
export const getGroupMembers = async (req, res) => {
  const members = await GroupMember.find({
    groupId: req.params.groupId
  }).populate("userId", "firstName email");

  res.json(members);
};

/**
 * UPDATE MEMBER ROLE (admin ↔ member)
 */
export const updateMemberRole = async (req, res) => {
  const { role } = req.body;

  const member = await GroupMember.findByIdAndUpdate(
    req.params.id,
    { role },
    { returnDocument: 'after' }
  );

  if (!member) {
    return res.status(404).json({ message: "Member not found" });
  }

  res.json(member);
};

/**
 * REMOVE MEMBER FROM GROUP
 */
export const removeMember = async (req, res) => {
  await GroupMember.findByIdAndDelete(req.params.id);
  res.json({ message: "Member removed from group" });
};
