import { create } from "zustand";
import * as chatService from "../services/chatService";

const useChatStore = create((set, get) => ({
    // Chat list
    chats: [],
    selectedChat: null,
    chatLoading: true,

    // Messages for currently selected chat
    messages: [],
    messagesLoading: false,

    // Real-time state
    onlineUsers: new Set(),
    typingUsers: {},
    unreadCounts: {},
    pinnedChats: new Set(),

    // Notifications
    notifications: [],

    // Chat mode: 'db' (persistent) or 'temp' (WebRTC ephemeral)
    chatMode: "db",
    webrtcStatus: "disconnected",
    tempMessages: [],
    tempModePending: false,
    tempModeRequest: null,

    // Actions
    setChats: (chats) => set({ chats }),
    setSelectedChat: (chat) =>
        set({
            selectedChat: chat,
            messages: [],
            tempMessages: [],
            chatMode: "db",
            webrtcStatus: "disconnected",
            tempModePending: false,
            tempModeRequest: null,
        }),

    setChatLoading: (loading) => set({ chatLoading: loading }),
    setMessagesLoading: (loading) => set({ messagesLoading: loading }),

    setMessages: (messages) => set({ messages }),
    addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),

    // Pins
    togglePin: (chatId) =>
        set((state) => {
            const newPinned = new Set(state.pinnedChats);
            if (newPinned.has(chatId)) {
                newPinned.delete(chatId);
            } else {
                newPinned.add(chatId);
            }
            return { pinnedChats: newPinned };
        }),

    // Online presence
    setUserOnline: (userId) =>
        set((state) => {
            const newSet = new Set(state.onlineUsers);
            newSet.add(userId);
            return { onlineUsers: newSet };
        }),
    setUserOffline: (userId) =>
        set((state) => {
            const newSet = new Set(state.onlineUsers);
            newSet.delete(userId);
            return { onlineUsers: newSet };
        }),
    setOnlineUsers: (userIds) =>
        set({ onlineUsers: new Set(userIds) }),

    // Typing..
    setTyping: (chatId, userId) =>
        set((state) => ({
            typingUsers: { ...state.typingUsers, [chatId]: userId },
        })),
    clearTyping: (chatId) =>
        set((state) => {
            const updated = { ...state.typingUsers };
            delete updated[chatId];
            return { typingUsers: updated };
        }),

    // Unread
    incrementUnread: (chatId) =>
        set((state) => ({
            unreadCounts: {
                ...state.unreadCounts,
                [chatId]: (state.unreadCounts[chatId] || 0) + 1,
            },
        })),
    clearUnread: (chatId) =>
        set((state) => ({
            unreadCounts: { ...state.unreadCounts, [chatId]: 0 },
        })),

    // Notifications
    addNotification: (notification) =>
        set((state) => ({
            notifications: [notification, ...state.notifications].slice(0, 50),
        })),
    clearNotifications: () => set({ notifications: [] }),
    removeNotification: (index) =>
        set((state) => ({
            notifications: state.notifications.filter((_, i) => i !== index),
        })),

    // Chat mode
    setChatMode: (mode) => set({ chatMode: mode }),
    setWebrtcStatus: (status) => set({ webrtcStatus: status }),
    setTempMessages: (msgs) => set({ tempMessages: msgs }),
    addTempMessage: (msg) =>
        set((state) => ({ tempMessages: [...state.tempMessages, msg] })),
    setTempModePending: (pending) => set({ tempModePending: pending }),
    setTempModeRequest: (request) => set({ tempModeRequest: request }),

    updateChatOnNewMessage: (chatId, message) =>
        set((state) => {
            const updated = state.chats.map((c) =>
                c._id === chatId ? { ...c, lastMessageId: message } : c
            );
            const chatIndex = updated.findIndex((c) => c._id === chatId);
            if (chatIndex > 0) {
                const [chat] = updated.splice(chatIndex, 1);
                updated.unshift(chat);
            }
            return { chats: updated };
        }),

    // Update participant online status in chat list
    updateParticipantStatus: (userId, isOnline) =>
        set((state) => ({
            chats: state.chats.map((chat) => ({
                ...chat,
                participants: chat.participants.map((p) =>
                    p._id === userId ? { ...p, isOnline } : p
                ),
            })),
        })),

    // Update message status (delivered/read)
    updateMessageStatus: (messageId, status) =>
        set((state) => ({
            messages: state.messages.map((m) =>
                m._id === messageId ? { ...m, status } : m
            ),
        })),

    // Batch mark messages as read in current view
    markMessagesAsRead: (chatId) =>
        set((state) => ({
            messages: state.messages.map((m) =>
                m.chatId === chatId ? { ...m, status: "read" } : m
            ),
        })),

    // Asynchronous and local message actions
    editMessage: async (messageId, encryptedPayload) => {
        try {
            const res = await chatService.editMessage(messageId, encryptedPayload);
            get().editMessageLocal(messageId, res.data);
            return res.data;
        } catch (error) {
            console.error("Failed to edit message:", error);
            throw error;
        }
    },

    deleteMessageForMe: async (messageId) => {
        try {
            await chatService.deleteMessageForMe(messageId);
            get().deleteMessageForMeLocal(messageId);
        } catch (error) {
            console.error("Failed to delete message for me:", error);
            throw error;
        }
    },

    deleteMessagesForMeBatch: async (messageIds) => {
        try {
            await chatService.deleteMessagesForMeBatch(messageIds);
            get().deleteMessagesForMeBatchLocal(messageIds);
        } catch (error) {
            console.error("Failed to delete batch messages:", error);
            throw error;
        }
    },

    clearChat: async (chatId, groupId) => {
        try {
            await chatService.clearChat(chatId, groupId);
            get().clearChatLocal();
        } catch (error) {
            console.error("Failed to clear chat:", error);
            throw error;
        }
    },

    editMessageLocal: (messageId, updatedMessage) =>
        set((state) => ({
            messages: state.messages.map((m) =>
                m._id === messageId ? { ...m, ...updatedMessage } : m
            ),
        })),

    deleteMessageForMeLocal: (messageId) =>
        set((state) => ({
            messages: state.messages.filter((m) => m._id !== messageId),
        })),

    deleteMessagesForMeBatchLocal: (messageIds) =>
        set((state) => ({
            messages: state.messages.filter((m) => !messageIds.includes(m._id)),
        })),

    clearChatLocal: () =>
        set({
            messages: [],
        }),
}));

export default useChatStore;
