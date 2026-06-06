import { useCallback } from "react";
import useChatStore from "../store/chatStore";
import useAuthStore from "../store/authStore";
import * as chatService from "../services/chatService";
import socketService from "../services/socketService";
import { toast } from "react-hot-toast";

// @desc : Chat hook — loads chats, messages, manages chat selection.

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
