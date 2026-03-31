import { create } from "zustand";

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
    typingUsers: {}, // { chatId: userId }
    unreadCounts: {}, // { chatId: count }
    pinnedChats: new Set(), // { chatId }

    // Chat mode: 'db' (persistent) or 'temp' (WebRTC ephemeral)
    chatMode: "db",
    webrtcStatus: "disconnected",
    tempMessages: [],

    // Actions
    setChats: (chats) => set({ chats }),
    setSelectedChat: (chat) =>
        set({
            selectedChat: chat,
            messages: [],
            tempMessages: [],
            chatMode: "db",
            webrtcStatus: "disconnected",
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

    // Typing
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

    // Chat mode
    setChatMode: (mode) => set({ chatMode: mode }),
    setWebrtcStatus: (status) => set({ webrtcStatus: status }),
    setTempMessages: (msgs) => set({ tempMessages: msgs }),
    addTempMessage: (msg) =>
        set((state) => ({ tempMessages: [...state.tempMessages, msg] })),

    // Update chat list on new message (move chat to top, update last message)
    updateChatOnNewMessage: (chatId, message) =>
        set((state) => {
            const updated = state.chats.map((c) =>
                c._id === chatId ? { ...c, lastMessageId: message } : c
            );
            // Move the updated chat to the top
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
}));

export default useChatStore;
