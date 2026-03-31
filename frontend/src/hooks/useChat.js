import { useCallback, useEffect, useRef } from "react";
import useChatStore from "../store/chatStore";
import useAuthStore from "../store/authStore";
import * as chatService from "../services/chatService";
import socketService from "../services/socketService";
import { toast } from "react-hot-toast";

/**
 * Chat hook — loads chats, messages, manages socket events.
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
        setUserOnline,
        setUserOffline,
        setTyping,
        clearTyping,
        incrementUnread,
        clearUnread,
        updateChatOnNewMessage,
        updateParticipantStatus,
        updateMessageStatus,
        setChatMode,
        setWebrtcStatus,
        addTempMessage,
        setTempMessages,
    } = useChatStore();

    const selectedChatRef = useRef(selectedChat);
    selectedChatRef.current = selectedChat;

    // Load chats on mount (no userId needed — backend uses JWT)
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
            }
        },
        [setSelectedChat, loadMessages, clearUnread]
    );

    // Send a message (DB mode)
    const sendDbMessage = useCallback(
        async (msgData) => {
            try {
                const res = await chatService.sendMessage(msgData);
                return res;
            } catch (error) {
                toast.error("Failed to send message");
                throw error;
            }
        },
        []
    );

    // Setup socket listeners
    useEffect(() => {
        if (!user?._id) return;

        const handleNewMessage = (msg) => {
            const currentChat = selectedChatRef.current;
            if (msg.chatId === currentChat?._id) {
                // Avoid duplicate: check if message with same _id already exists
                const existing = useChatStore.getState().messages;
                const isDuplicate = existing.some(
                    (m) => m._id === msg._id || (m._id && String(m._id).length < 20 && m.encryptedPayload === msg.encryptedPayload)
                );
                if (!isDuplicate) {
                    addMessage(msg);
                }
            } else {
                incrementUnread(msg.chatId);
            }
            updateChatOnNewMessage(msg.chatId, msg);
        };

        const handleUserStatus = ({ userId, isOnline }) => {
            if (isOnline) {
                setUserOnline(userId);
            } else {
                setUserOffline(userId);
            }
            updateParticipantStatus(userId, isOnline);
        };

        const handleTyping = ({ from, isTyping: typing }) => {
            const currentChat = selectedChatRef.current;
            if (currentChat) {
                if (typing) {
                    setTyping(currentChat._id, from);
                } else {
                    clearTyping(currentChat._id);
                }
            }
        };

        const handleMessageStatusUpdate = ({ messageId, status }) => {
            updateMessageStatus(messageId, status);
        };

        socketService.on("new-message", handleNewMessage);
        socketService.on("user-status", handleUserStatus);
        socketService.on("typing", handleTyping);
        socketService.on("message-status-update", handleMessageStatusUpdate);

        return () => {
            socketService.off("new-message", handleNewMessage);
            socketService.off("user-status", handleUserStatus);
            socketService.off("typing", handleTyping);
            socketService.off("message-status-update", handleMessageStatusUpdate);
        };
    }, [user?._id]);

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
