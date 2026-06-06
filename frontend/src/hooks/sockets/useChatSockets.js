import { useEffect } from "react";
import socketService from "../../services/socketService";
import useChatStore from "../../store/chatStore";
import useGroupStore from "../../store/groupStore";
import { toast } from "react-hot-toast";

export const useChatSockets = (user) => {
    useEffect(() => {
        if (!user?._id) return;

        const handleNewMessage = (msg) => {
            const state = useChatStore.getState();
            const currentChat = state.selectedChat;

            if (msg.chatId === currentChat?._id) {
                const isDuplicate = state.messages.some((m) => m._id === msg._id);
                if (!isDuplicate) {
                    const senderIdStr = (msg.senderId && typeof msg.senderId === "object") ? msg.senderId._id : msg.senderId;
                    const matchIndex = state.messages.findIndex((m) => {
                        const isTemp = String(m._id).startsWith("temp-");
                        if (!isTemp) return false;

                        const mSenderIdStr = (m.senderId && typeof m.senderId === "object") ? m.senderId._id : m.senderId;
                        if (String(mSenderIdStr) !== String(senderIdStr)) return false;

                        if (m.encryptedPayload !== msg.encryptedPayload) return false;

                        const timeDiff = Math.abs(new Date(m.createdAt).getTime() - new Date(msg.createdAt).getTime());
                        return timeDiff < 10000;
                    });

                    if (matchIndex !== -1) {
                        const updated = [...state.messages];
                        updated[matchIndex] = { ...msg, senderId: msg.senderId || state.messages[matchIndex].senderId };
                        useChatStore.setState({ messages: updated });
                    } else {
                        useChatStore.getState().addMessage(msg);
                    }
                }
                socketService.emit("message-read-batch", {
                    chatId: msg.chatId,
                    readerId: user._id,
                });
            } else {
                useChatStore.getState().incrementUnread(msg.chatId);
            }
            useChatStore.getState().updateChatOnNewMessage(msg.chatId, msg);
        };

        const handleUserStatus = ({ userId, isOnline }) => {
            const store = useChatStore.getState();
            if (isOnline) {
                store.setUserOnline(userId);
            } else {
                store.setUserOffline(userId);
            }
            store.updateParticipantStatus(userId, isOnline);
        };

        const handleTypingEvent = ({ from, isTyping }) => {
            const state = useChatStore.getState();
            const currentChat = state.selectedChat;
            if (currentChat) {
                if (isTyping) {
                    useChatStore.getState().setTyping(currentChat._id, from);
                } else {
                    useChatStore.getState().clearTyping(currentChat._id);
                }
            }
        };

        const handleMessageStatusUpdate = ({ messageId, status }) => {
            useChatStore.getState().updateMessageStatus(messageId, status);
        };

        const handleMessagesReadBatch = ({ chatId }) => {
            const currentChat = useChatStore.getState().selectedChat;
            if (currentChat?._id === chatId) {
                useChatStore.getState().markMessagesAsRead(chatId);
            }
        };

        const handleOnlineUsersList = (userIds) => {
            const store = useChatStore.getState();
            store.setOnlineUsers(userIds);
            for (const onlineId of userIds) {
                store.updateParticipantStatus(onlineId, true);
            }
        };

        const handleTempMessage = ({ from, message }) => {
            const state = useChatStore.getState();
            const currentChat = state.selectedChat;
            const chatMode = state.chatMode;

            if (currentChat && chatMode === "temp") {
                const otherParticipant = currentChat.participants?.find((p) => p._id !== user._id);
                if (otherParticipant && otherParticipant._id === from) {
                    const isDuplicate = state.tempMessages.some((m) => m._id === message._id);
                    if (!isDuplicate) {
                        useChatStore.getState().addTempMessage(message);
                    }
                    return;
                }
            }
            toast("New temporary message", { icon: "⚡", duration: 3000 });
        };

        const handleTempUserOffline = () => {
            const state = useChatStore.getState();
            if (state.chatMode === "temp") {
                useChatStore.getState().setChatMode("db");
                toast.error("User went offline. Switched to DB mode.", { icon: "", duration: 4000 });
            }
        };

        const handleTempModeRequest = ({ from, fromName }) => {
            const state = useChatStore.getState();
            const currentChat = state.selectedChat;
            if (currentChat) {
                const otherParticipant = currentChat.participants?.find((p) => p._id !== user._id);
                if (otherParticipant && otherParticipant._id === from) {
                    useChatStore.getState().setTempModeRequest({ fromUserId: from, fromUserName: fromName, isActive: true });
                    return;
                }
            }
            socketService.emit("temp-mode-declined", { to: from });
        };

        const handleTempModeAccepted = ({ from }) => {
            const state = useChatStore.getState();
            const currentChat = state.selectedChat;
            if (currentChat) {
                const otherParticipant = currentChat.participants?.find((p) => p._id !== user._id);
                if (otherParticipant && otherParticipant._id === from) {
                    useChatStore.getState().setTempModePending(false);
                    useChatStore.getState().setChatMode("temp");
                    toast.success("Temporary chat mode activated!", { icon: "" });
                    return;
                }
            }
            useChatStore.getState().setTempModePending(false);
        };

        const handleTempModeDeclined = ({ from }) => {
            const state = useChatStore.getState();
            const currentChat = state.selectedChat;
            if (currentChat) {
                const otherParticipant = currentChat.participants?.find((p) => p._id !== user._id);
                if (otherParticipant && otherParticipant._id === from) {
                    useChatStore.getState().setTempModePending(false);
                    toast.error("Temporary mode request was declined.", { duration: 4000 });
                    return;
                }
            }
            useChatStore.getState().setTempModePending(false);
        };

        const handleTempModeOff = ({ from }) => {
            const state = useChatStore.getState();
            const currentChat = state.selectedChat;
            if (currentChat) {
                const otherParticipant = currentChat.participants?.find((p) => p._id !== user._id);
                if (otherParticipant && otherParticipant._id === from) {
                    useChatStore.getState().setChatMode("db");
                    toast("Peer disabled temporary mode. Switched to standard chat.", { icon: "" });
                }
            }
        };

        const handleMessageEdited = (msg) => {
            if (msg.groupId) {
                useGroupStore.getState().editGroupMessageLocal(msg._id, msg);
            } else {
                useChatStore.getState().editMessageLocal(msg._id, msg);
            }
        };

        const handleMessageDeletedForUser = ({ messageId, chatId, groupId }) => {
            if (groupId) {
                useGroupStore.getState().deleteGroupMessageForMeLocal(messageId);
            } else {
                useChatStore.getState().deleteMessageForMeLocal(messageId);
            }
        };

        const handleMessagesDeletedForUser = ({ messageIds }) => {
            useChatStore.getState().deleteMessagesForMeBatchLocal(messageIds);
            useGroupStore.getState().deleteGroupMessagesForMeBatchLocal(messageIds);
        };

        const handleChatClearedForUser = ({ chatId, groupId }) => {
            const currentChat = useChatStore.getState().selectedChat;
            const currentGroup = useGroupStore.getState().selectedGroup;

            if (chatId && currentChat?._id === chatId) {
                useChatStore.getState().clearChatLocal();
            }
            if (groupId && currentGroup?._id === groupId) {
                useGroupStore.getState().clearGroupChatLocal();
            }
        };

        socketService.on("new-message", handleNewMessage);
        socketService.on("user-status", handleUserStatus);
        socketService.on("typing", handleTypingEvent);
        socketService.on("message-status-update", handleMessageStatusUpdate);
        socketService.on("messages-read-batch", handleMessagesReadBatch);
        socketService.on("online-users-list", handleOnlineUsersList);
        socketService.on("temp-message", handleTempMessage);
        socketService.on("temp-user-offline", handleTempUserOffline);
        socketService.on("temp-mode-request", handleTempModeRequest);
        socketService.on("temp-mode-accepted", handleTempModeAccepted);
        socketService.on("temp-mode-declined", handleTempModeDeclined);
        socketService.on("temp-mode-off", handleTempModeOff);
        socketService.on("messageEdited", handleMessageEdited);
        socketService.on("messageDeletedForUser", handleMessageDeletedForUser);
        socketService.on("messagesDeletedForUser", handleMessagesDeletedForUser);
        socketService.on("chatClearedForUser", handleChatClearedForUser);

        return () => {
            socketService.off("new-message", handleNewMessage);
            socketService.off("user-status", handleUserStatus);
            socketService.off("typing", handleTypingEvent);
            socketService.off("message-status-update", handleMessageStatusUpdate);
            socketService.off("messages-read-batch", handleMessagesReadBatch);
            socketService.off("online-users-list", handleOnlineUsersList);
            socketService.off("temp-message", handleTempMessage);
            socketService.off("temp-user-offline", handleTempUserOffline);
            socketService.off("temp-mode-request", handleTempModeRequest);
            socketService.off("temp-mode-accepted", handleTempModeAccepted);
            socketService.off("temp-mode-declined", handleTempModeDeclined);
            socketService.off("temp-mode-off", handleTempModeOff);
            socketService.off("messageEdited", handleMessageEdited);
            socketService.off("messageDeletedForUser", handleMessageDeletedForUser);
            socketService.off("messagesDeletedForUser", handleMessagesDeletedForUser);
            socketService.off("chatClearedForUser", handleChatClearedForUser);
        };
    }, [user?._id]);
};
