import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Phone, Video, MoreHorizontal, ArrowLeft } from "lucide-react";
import Avatar from "../common/Avatar";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import SkeletonLoader from "../common/SkeletonLoader";
import useChat from "../../hooks/useChat";
import useAuthStore from "../../store/authStore";
import useChatStore from "../../store/chatStore";
import useUiStore from "../../store/uiStore";
import { encryptMessage } from "../../utils/encryption";
import { sendMediaMessage } from "../../services/chatService";
import socketService from "../../services/socketService";
import { toast } from "react-hot-toast";

const ChatWindow = () => {
    const user = useAuthStore((s) => s.user);
    const selectedChat = useChatStore((s) => s.selectedChat);
    const messages = useChatStore((s) => s.messages);
    const messagesLoading = useChatStore((s) => s.messagesLoading);
    const chatMode = useChatStore((s) => s.chatMode);
    const webrtcStatus = useChatStore((s) => s.webrtcStatus);
    const tempMessages = useChatStore((s) => s.tempMessages);
    const typingUsers = useChatStore((s) => s.typingUsers);
    const toggleProfilePanel = useUiStore((s) => s.toggleProfilePanel);
    const setMobileChatOpen = useUiStore((s) => s.setMobileChatOpen);

    const {
        sendDbMessage,
        addMessage,
        addTempMessage,
    } = useChat();

    const scrollRef = useRef();
    const messagesEndRef = useRef();

    const otherUser = useMemo(
        () => selectedChat?.participants?.find((p) => p._id !== user?._id) || {},
        [selectedChat, user?._id]
    );

    const isTyping = useMemo(
        () => selectedChat && typingUsers[selectedChat._id] === otherUser._id,
        [selectedChat, typingUsers, otherUser._id]
    );

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, tempMessages]);

    const handleSend = useCallback(
        async (text) => {
            if (!text.trim()) return;

            if (chatMode === "temp") {
                if (webrtcStatus !== "connected") {
                    toast.error("WebRTC connecting, please wait...");
                    return;
                }
                const msgData = {
                    _id: "temp-" + Date.now() + Math.random(),
                    senderId: user,
                    messageType: "text",
                    encryptedPayload: text,
                    createdAt: new Date().toISOString(),
                };
                addTempMessage(msgData);
            } else {
                const encrypted = await encryptMessage(text);
                const msgData = {
                    chatId: selectedChat._id,
                    senderId: user._id,
                    messageType: "text",
                    encryptedPayload: encrypted,
                };

                // Optimistic add with temporary ID
                const tempId = "temp-" + Date.now() + Math.random();
                addMessage({
                    _id: tempId,
                    ...msgData,
                    senderId: user,
                    createdAt: new Date().toISOString(),
                    status: "sent",
                });

                try {
                    const saved = await sendDbMessage(msgData);
                    // Replace temp message with real one from server
                    const current = useChatStore.getState().messages;
                    const updated = current.map((m) =>
                        m._id === tempId ? { ...saved, senderId: saved.senderId || user } : m
                    );
                    useChatStore.setState({ messages: updated });
                } catch {
                    // Remove failed temp message
                    const current = useChatStore.getState().messages;
                    useChatStore.setState({
                        messages: current.filter((m) => m._id !== tempId),
                    });
                }
            }
        },
        [chatMode, webrtcStatus, user, selectedChat, addMessage, sendDbMessage, addTempMessage]
    );

    const handleFileUpload = useCallback(
        async (file, caption) => {
            if (chatMode === "temp") {
                toast.error("File upload not available in temporary mode");
                return;
            }

            const formData = new FormData();
            formData.append("file", file);
            formData.append("chatId", selectedChat._id);
            formData.append("senderId", user._id);
            formData.append("messageType", file.type.startsWith("image/") ? "image" : "document");
            if (caption) {
                const encrypted = await encryptMessage(caption);
                formData.append("encryptedPayload", encrypted);
            }

            try {
                const msg = await sendMediaMessage(formData);
                addMessage(msg);
                toast.success("File sent!");
            } catch {
                toast.error("Failed to upload file");
            }
        },
        [chatMode, selectedChat, user, addMessage]
    );

    const handleTyping = useCallback(
        (isTypingState) => {
            socketService.emit("typing", {
                to: otherUser._id,
                isTyping: isTypingState,
            });
        },
        [otherUser._id]
    );

    if (!selectedChat) return null;

    const displayMessages = chatMode === "temp" ? tempMessages : messages;

    return (
        <div className="h-full flex flex-col relative w-full" style={{ background: 'var(--panel-bg)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800/50 shrink-0 z-10">
                <div className="flex items-center gap-3">
                    {/* Mobile back button */}
                    <button
                        onClick={() => setMobileChatOpen(false)}
                        className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mr-1"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <Avatar
                        src={otherUser.profileImage}
                        name={`${otherUser.firstName || ""} ${otherUser.lastName || ""}`}
                        isOnline={otherUser.isOnline}
                        size="md"
                    />
                    <div>
                        <h2 className="text-[15px] font-bold text-gray-800 dark:text-gray-100 leading-tight font-display">
                            {otherUser.firstName} {otherUser.lastName}
                        </h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${otherUser.isOnline ? 'bg-green-400' : 'bg-gray-300'}`}></span>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                {isTyping ? (
                                    <span className="text-teal-500 font-medium">typing...</span>
                                ) : otherUser.isOnline ? 'Online' : 'Offline'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <Phone size={16} />
                    </button>
                    <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <Video size={16} />
                    </button>
                    <button
                        onClick={() => toggleProfilePanel()}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <MoreHorizontal size={16} />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar relative"
                style={{ background: 'var(--bg-color)' }}
            >
                <div className="dark:hidden absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="1" fill="%23666"/></svg>')`, backgroundSize: '24px 24px' }} />

                <div className="relative z-10 space-y-4 h-full flex flex-col justify-end min-h-full">
                    <div className="flex-1"></div>
                    {messagesLoading ? (
                        <SkeletonLoader type="messages" count={6} />
                    ) : displayMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center mb-3 shadow-sm">
                                <span className="text-2xl">👋</span>
                            </div>
                            <p className="text-[14px] font-medium mb-1">Say hello to {otherUser.firstName}!</p>
                            <p className="text-[12px] text-gray-400/80">Send your first message to start a conversation.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {displayMessages.map((msg, index) => {
                                const prevMsg = displayMessages[index - 1];
                                const senderId = typeof msg.senderId === "string" ? msg.senderId : msg.senderId?._id;
                                const isMe = senderId === user?._id;
                                const prevSenderId = prevMsg ? (typeof prevMsg.senderId === "string" ? prevMsg.senderId : prevMsg.senderId?._id) : null;
                                const wasMePrev = prevMsg && prevSenderId === user?._id;
                                const isGrouped = prevMsg && isMe === wasMePrev;

                                return (
                                    <div key={msg._id || index} className={`animate-msg-fade-in ${isGrouped ? '-mt-2' : ''}`}>
                                        <MessageBubble
                                            message={msg}
                                            isMe={isMe}
                                            chatMode={chatMode}
                                            isGrouped={isGrouped}
                                            otherUser={otherUser}
                                        />
                                    </div>
                                );
                            })}

                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-700">
                                        <div className="flex gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} className="h-2" />
                        </div>
                    )}
                </div>
            </div>

            {/* Input Area */}
            <div className="px-5 pb-4 pt-2 shrink-0" style={{ background: 'var(--panel-bg)' }}>
                <MessageInput
                    onSend={handleSend}
                    onTyping={handleTyping}
                    onFileUpload={handleFileUpload}
                    disabled={chatMode === "temp" && webrtcStatus !== "connected"}
                />
            </div>
        </div>
    );
};

export default ChatWindow;
