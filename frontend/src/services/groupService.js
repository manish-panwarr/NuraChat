import api from "./api";

const groupService = {
  // Group Operations
  createGroup: async (groupData) => {
    const res = await api.post("/groups", groupData);
    return res.data;
  },

  getMyGroups: async () => {
    const res = await api.get("/groups");
    return res.data;
  },

  getGroupById: async (groupId) => {
    const res = await api.get(`/groups/${groupId}`);
    return res.data;
  },

  updateGroup: async (groupId, updateData) => {
    const res = await api.put(`/groups/${groupId}`, updateData);
    return res.data;
  },

  deleteGroup: async (groupId) => {
    const res = await api.delete(`/groups/${groupId}`);
    return res.data;
  },

  // Member Operations
  getGroupMembers: async (groupId) => {
    const res = await api.get(`/group-members/${groupId}`);
    return res.data;
  },

  addGroupMember: async (groupId, userId, role = "member") => {
    const res = await api.post("/group-members", { groupId, userId, role });
    return res.data;
  },

  updateMemberRole: async (memberId, role) => {
    const res = await api.put(`/group-members/${memberId}`, { role });
    return res.data;
  },

  removeGroupMember: async (memberId) => {
    const res = await api.delete(`/group-members/${memberId}`);
    return res.data;
  },
  
  acceptInvite: async (groupId) => {
    const res = await api.post("/group-members/accept", { groupId });
    return res.data;
  },
  
  rejectInvite: async (groupId) => {
    const res = await api.post("/group-members/reject", { groupId });
    return res.data;
  },

  // Message Operations
  getGroupMessages: async (groupId) => {
    const res = await api.get(`/group-messages/${groupId}`);
    return res.data;
  },

  sendGroupMessage: async (messageData) => {
    const res = await api.post("/group-messages", messageData);
    return res.data;
  },

  sendGroupMediaMessage: async (formData) => {
    const res = await api.post("/group-messages/media", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
  },

  deleteGroupMessage: async (messageId) => {
    const res = await api.delete(`/group-messages/${messageId}`);
    return res.data;
  }
};

export default groupService;
