import { create } from "zustand";
import groupService from "../services/groupService";
import { encryptMessage, decryptMessage } from "../utils/encryption";

const useGroupStore = create((set, get) => ({
  groups: [],
  selectedGroup: null,
  groupMessages: [],
  groupMembers: [],
  isLoadingGroups: false,
  isLoadingMessages: false,
  typingUsers: {},
  activeGroupCalls: {},

  setActiveGroupCall: (groupId, callDetails) => {
    set((state) => {
      const nextCalls = { ...state.activeGroupCalls };
      if (callDetails.active) {
        nextCalls[groupId] = callDetails;
      } else {
        delete nextCalls[groupId];
      }
      return { activeGroupCalls: nextCalls };
    });
  },

  setActiveGroupCallsList: (callsList) => {
    const nextCalls = {};
    callsList.forEach(c => {
      nextCalls[c.groupId] = c;
    });
    set({ activeGroupCalls: nextCalls });
  },

  fetchMyGroups: async () => {
    set({ isLoadingGroups: true });
    try {
      const groups = await groupService.getMyGroups();
      set({ groups, isLoadingGroups: false });
    } catch (error) {
      console.error("Failed to fetch groups", error);
      set({ isLoadingGroups: false });
    }
  },

  setSelectedGroup: async (group) => {
    set({ selectedGroup: group });
    if (group) {
      get().fetchGroupMessages(group._id);
      get().fetchGroupMembers(group._id);
    } else {
      set({ groupMessages: [], groupMembers: [] });
    }
  },

  fetchGroupMessages: async (groupId) => {
    set({ isLoadingMessages: true });
    try {
      const messages = await groupService.getGroupMessages(groupId);
      set({ groupMessages: messages, isLoadingMessages: false });
    } catch (error) {
      console.error("Failed to fetch group messages", error);
      set({ isLoadingMessages: false });
    }
  },

  fetchGroupMembers: async (groupId) => {
    try {
      const members = await groupService.getGroupMembers(groupId);
      set({ groupMembers: members });
    } catch (error) {
      console.error("Failed to fetch members", error);
    }
  },

  addGroupMember: async (groupId, userId, role = "member") => {
    try {
      const member = await groupService.addGroupMember(groupId, userId, role);
      set((state) => ({
        groupMembers: [...state.groupMembers, member]
      }));
      return member;
    } catch (error) {
      console.error("Failed to add member", error);
      throw error;
    }
  },

  removeGroupMember: async (groupId, memberId) => {
    try {
      await groupService.removeGroupMember(memberId);
      set((state) => ({
        groupMembers: state.groupMembers.filter((m) => m._id !== memberId)
      }));
    } catch (error) {
      console.error("Failed to remove member", error);
      throw error;
    }
  },

  updateMemberRole: async (memberId, role) => {
    try {
      const updated = await groupService.updateMemberRole(memberId, role);
      set((state) => ({
        groupMembers: state.groupMembers.map((m) => m._id === memberId ? updated : m)
      }));
    } catch (error) {
      console.error("Failed to update member role", error);
      throw error;
    }
  },

  updateGroup: async (groupId, updateData) => {
    try {
      const updated = await groupService.updateGroup(groupId, updateData);
      set((state) => ({
        groups: state.groups.map((g) => g._id === groupId ? updated : g),
        selectedGroup: state.selectedGroup?._id === groupId ? updated : state.selectedGroup
      }));
      return updated;
    } catch (error) {
      console.error("Failed to update group details", error);
      throw error;
    }
  },

  uploadGroupAvatar: async (groupId, file) => {
    try {
      const res = await groupService.uploadGroupAvatar(groupId, file);
      const updated = res.group;
      set((state) => ({
        groups: state.groups.map((g) => g._id === groupId ? updated : g),
        selectedGroup: state.selectedGroup?._id === groupId ? updated : state.selectedGroup
      }));
      return updated;
    } catch (error) {
      console.error("Failed to upload group avatar", error);
      throw error;
    }
  },

  editGroupMessageLocal: (messageId, updatedMessage) =>
    set((state) => ({
      groupMessages: state.groupMessages.map((m) =>
        m._id === messageId ? { ...m, ...updatedMessage } : m
      ),
    })),

  deleteGroupMessageForMeLocal: (messageId) =>
    set((state) => ({
      groupMessages: state.groupMessages.filter((m) => m._id !== messageId),
    })),

  deleteGroupMessagesForMeBatchLocal: (messageIds) =>
    set((state) => ({
      groupMessages: state.groupMessages.filter((m) => !messageIds.includes(m._id)),
    })),

  clearGroupChatLocal: () =>
    set({
      groupMessages: [],
    }),

  addGroupMessage: (message) => {
    set((state) => {
      if (state.selectedGroup && state.selectedGroup._id === message.groupId) {
        const exists = state.groupMessages.find(m => m._id === message._id);
        if (exists) return state;
        return { groupMessages: [...state.groupMessages, message] };
      }
      return state;
    });
  },

  sendGroupDbMessage: async (payload) => {
    try {
      const saved = await groupService.sendGroupMessage(payload);
      return saved;
    } catch (error) {
      console.error("Failed to send message", error);
      throw error;
    }
  },

  setTyping: (groupId, userId, isTyping) => {
    set((state) => {
      const typs = { ...state.typingUsers };
      const groupTyps = typs[groupId] || [];
      if (isTyping) {
        if (!groupTyps.includes(userId)) typs[groupId] = [...groupTyps, userId];
      } else {
        typs[groupId] = groupTyps.filter(id => id !== userId);
      }
      return { typingUsers: typs };
    });
  }
}));

export default useGroupStore;
