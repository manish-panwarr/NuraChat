import Group from "../models/group.model.js";
import GroupMember from "../models/groupMember.model.js";

export const createGroup = async (req, res) => {
  const { groupName, createdBy } = req.body;

  if (!groupName || !createdBy) {
    return res.status(400).json({
      message: "groupName and createdBy are required"
    });
  }

  const group = await Group.create({
    groupName,
    createdBy
  });

  // creator becomes admin
  await GroupMember.create({
    groupId: group._id,
    userId: createdBy,
    role: "admin"
  });

  res.status(201).json(group);
};

export const getAllGroups = async (req, res) => {
  const groups = await Group.find();
  res.json(groups);
};

export const getGroupById = async (req, res) => {
  const group = await Group.findById(req.params.id);

  if (!group) {
    return res.status(404).json({ message: "Group not found" });
  }

  res.json(group);
};

export const updateGroup = async (req, res) => {
  const group = await Group.findByIdAndUpdate(
    req.params.id,
    req.body,
    { returnDocument: 'after' }
  );

  if (!group) {
    return res.status(404).json({ message: "Group not found" });
  }

  res.json(group);
};

export const deleteGroup = async (req, res) => {
  await Group.findByIdAndDelete(req.params.id);

  // cleanup members
  await GroupMember.deleteMany({ groupId: req.params.id });

  res.json({ message: "Group deleted successfully" });
};
