import { useCallback, useEffect, useRef } from "react";
import useChatStore from "../store/chatStore";
import useGroupStore from "../store/groupStore";
import useAuthStore from "../store/authStore";
import useNotificationStore from "../store/notificationStore";
import * as chatService from "../services/chatService";
import socketService from "../services/socketService";
import { toast } from "react-hot-toast";

// Track if socket listeners are already set up globally to prevent duplicates
let socketListenersRegistered = false;
let currentListenerUserId = null;

function setupSocketListeners(userId) {
    // Prevent duplicate registration
    if (socketListenersRegistered && currentListenerUserId === userId) return;

    // Clean up previous listeners if switching user
    if (socketListenersRegistered) {
        teardownSocketListeners();
    }

    socketListenersRegistered = true;
    currentListenerUserId = userId;

    socketService.on("new-message", handleNewMessage);
    socketService.on("user-status", handleUserStatus);
    socketService.on("typing", handleTypingEvent);
    socketService.on("message-status-update", handleMessageStatusUpdate);
    socketService.on("messages-read-batch", handleMessagesReadBatch);
    socketService.on("online-users-list", handleOnlineUsersList);
    socketService.on("notification", handleNotification); // Legacy notifications
    socketService.on("new-notification", handleNewNotification); // Group notifications
    socketService.on("new-group-message", handleNewGroupMessage);
}

function teardownSocketListeners() {
    socketService.off("new-message", handleNewMessage);
    socketService.off("user-status", handleUserStatus);
    socketService.off("typing", handleTypingEvent);
    socketService.off("message-status-update", handleMessageStatusUpdate);
    socketService.off("messages-read-batch", handleMessagesReadBatch);
    socketService.off("online-users-list", handleOnlineUsersList);
    socketService.off("notification", handleNotification);
    socketService.off("new-notification", handleNewNotification);
    socketService.off("new-group-message", handleNewGroupMessage);
    socketListenersRegistered = false;
    currentListenerUserId = null;
}

// --- Global socket event handlers (use store.getState() for fresh state) ---

function handleNewMessage(msg) {
    const state = useChatStore.getState();
    const currentChat = state.selectedChat;

    if (msg.chatId === currentChat?._id) {
        // Check for duplicate
        const isDuplicate = state.messages.some((m) => m._id === msg._id);
        if (!isDuplicate) {
            useChatStore.getState().addMessage(msg);
        }
        // Mark as read since we're viewing this chat
        socketService.emit("message-read-batch", {
            chatId: msg.chatId,
            readerId: currentListenerUserId,
        });
    } else {
        useChatStore.getState().incrementUnread(msg.chatId);
    }
    useChatStore.getState().updateChatOnNewMessage(msg.chatId, msg);
}

function handleUserStatus({ userId, isOnline }) {
    const store = useChatStore.getState();
    if (isOnline) {
        store.setUserOnline(userId);
    } else {
        store.setUserOffline(userId);
    }
    store.updateParticipantStatus(userId, isOnline);
}

function handleTypingEvent({ from, isTyping }) {
    const state = useChatStore.getState();
    const currentChat = state.selectedChat;
    if (currentChat) {
        if (isTyping) {
            useChatStore.getState().setTyping(currentChat._id, from);
        } else {
            useChatStore.getState().clearTyping(currentChat._id);
        }
    }
}

function handleMessageStatusUpdate({ messageId, status }) {
    useChatStore.getState().updateMessageStatus(messageId, status);
}

function handleMessagesReadBatch({ chatId }) {
    const currentChat = useChatStore.getState().selectedChat;
    if (currentChat?._id === chatId) {
        useChatStore.getState().markMessagesAsRead(chatId);
    }
}

function handleOnlineUsersList(userIds) {
    const store = useChatStore.getState();
    store.setOnlineUsers(userIds);
    for (const onlineId of userIds) {
        store.updateParticipantStatus(onlineId, true);
    }
}

function handleNotification(notification) {
    // Legacy mapping (if still used)
    useNotificationStore.getState().addNotification({
        _id: "legacy-" + Date.now(),
        type: "system",
        title: "Message",
        body: notification.message || "New message",
        isRead: false,
        createdAt: new Date().toISOString()
    });
    toast(notification.message || "New message", {
        icon: "💬",
        duration: 3000,
    });
}

function handleNewNotification(notification) {
    useNotificationStore.getState().addNotification(notification);
    toast(notification.title || "New Activity", {
        icon: "🔔",
        duration: 3000,
    });
}

function handleNewGroupMessage(msg) {
    useGroupStore.getState().addGroupMessage(msg);
    const selectedGroup = useGroupStore.getState().selectedGroup;
    
    // If we're not inside the active group, we should ideally increment an unread badge
    if (!selectedGroup || selectedGroup._id !== msg.groupId) {
        toast(`New message in group`, {
            icon: "💬",
            duration: 3000,
            id: `group-msg-${msg.groupId}` // Prevent spam
        });
    }
}

/**
 * Chat hook — loads chats, messages, manages socket events.
 * Socket listeners are registered ONCE globally (not per component instance).
 */
export default function useChat() {
    const user = useAuthStore((s) => s.user);
    const {
        chats,
        selectedChat,
        messages,
        chatLoading,
        messagesLoading,
        onlineUsers,
        typingUsers,
        unreadCounts,
        chatMode,
        webrtcStatus,
        tempMessages,
        setChats,
        setSelectedChat,
        setChatLoading,
        setMessages,
        setMessagesLoading,
        addMessage,
        clearUnread,
        setChatMode,
        setWebrtcStatus,
        addTempMessage,
        setTempMessages,
    } = useChatStore();

    // Register socket listeners once when user is available
    useEffect(() => {
        if (!user?._id) return;
        setupSocketListeners(user._id);
        return () => {
            // Only teardown when this specific component/hook is the last one
            // We use a ref count approach — but simpler: just leave them up
            // They'll be torn down on disconnect in Home.jsx
        };
    }, [user?._id]);

    // Load chats
    const loadChats = useCallback(async () => {
        if (!user?._id) return;
        setChatLoading(true);
        try {
            const data = await chatService.fetchUserChats();
            setChats(data);
        } catch (error) {
            toast.error("Failed to load chats");
        } finally {
            setChatLoading(false);
        }
    }, [user?._id, setChats, setChatLoading]);

    // Load messages for selected chat
    const loadMessages = useCallback(
        async (chatId) => {
            if (!chatId) return;
            setMessagesLoading(true);
            try {
                const data = await chatService.fetchChatMessages(chatId);
                setMessages(data);
            } catch (error) {
                toast.error("Failed to load messages");
            } finally {
                setMessagesLoading(false);
            }
        },
        [setMessages, setMessagesLoading]
    );

    // Select a chat and load its messages
    const selectChat = useCallback(
        (chat) => {
            setSelectedChat(chat);
            if (chat?._id) {
                loadMessages(chat._id);
                clearUnread(chat._id);
                if (user?._id) {
                    socketService.emit("message-read-batch", {
                        chatId: chat._id,
                        readerId: user._id,
                    });
                }
            }
        },
        [setSelectedChat, loadMessages, clearUnread, user?._id]
    );

    // Send a message (DB mode)
    const sendDbMessage = useCallback(
        async (msgData) => {
            try {
                return await chatService.sendMessage(msgData);
            } catch (error) {
                toast.error("Failed to send message");
                throw error;
            }
        },
        []
    );

    return {
        chats,
        selectedChat,
        messages,
        chatLoading,
        messagesLoading,
        onlineUsers,
        typingUsers,
        unreadCounts,
        chatMode,
        webrtcStatus,
        tempMessages,
        loadChats,
        loadMessages,
        selectChat,
        sendDbMessage,
        setChatMode,
        setWebrtcStatus,
        addTempMessage,
        setTempMessages,
        addMessage,
        clearUnread,
    };
}

// Export for cleanup in Home.jsx on unmount
export { teardownSocketListeners };
