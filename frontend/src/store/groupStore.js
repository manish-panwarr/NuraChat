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
  typingUsers: {}, // { groupId: [userIds] }
  
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
      // We don't decrypt here automatically, components will handle displaying them using the group's encryptionSalt
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

  addGroupMessage: (message) => {
    set((state) => {
      // Only add if it belongs to selected group
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
