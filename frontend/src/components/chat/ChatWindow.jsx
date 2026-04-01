import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Phone, Video, MoreHorizontal, ArrowLeft, Loader2, User, Trash2, AlertTriangle, X } from "lucide-react";
import Avatar from "../common/Avatar";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import SkeletonLoader from "../common/SkeletonLoader";
import useChat from "../../hooks/useChat";
import useAuthStore from "../../store/authStore";
import useChatStore from "../../store/chatStore";
import useUiStore from "../../store/uiStore";
import { encryptMessage } from "../../utils/encryption";
import { sendMediaMessage, deleteChat as deleteChatApi } from "../../services/chatService";
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
    const showProfilePanel = useUiStore((s) => s.showProfilePanel);
    const setShowProfilePanel = useUiStore((s) => s.setShowProfilePanel);
    const setMobileChatOpen = useUiStore((s) => s.setMobileChatOpen);

    const {
        sendDbMessage,
        addMessage,
        addTempMessage,
        loadChats,
    } = useChat();

    const scrollRef = useRef();
    const messagesEndRef = useRef();
    const [isUploading, setIsUploading] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const otherUser = useMemo(
        () => selectedChat?.participants?.find((p) => p._id !== user?._id) || {},
        [selectedChat, user?._id]
    );

    const isTyping = useMemo(
        () => selectedChat && typingUsers[selectedChat._id] === otherUser._id,
        [selectedChat, typingUsers, otherUser._id]
    );

    // Always scroll to bottom on new messages or chat change
    useEffect(() => {
        const el = scrollRef.current;
        if (el) {
            // Use requestAnimationFrame for reliable DOM timing
            requestAnimationFrame(() => {
                el.scrollTop = el.scrollHeight;
            });
        }
    }, [messages, tempMessages, selectedChat?._id]);

    // Scroll to bottom on initial load too
    useEffect(() => {
        if (!messagesLoading && messages.length > 0) {
            const el = scrollRef.current;
            if (el) {
                requestAnimationFrame(() => {
                    el.scrollTop = el.scrollHeight;
                });
            }
        }
    }, [messagesLoading, messages.length]);

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

                // Optimistic add
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
                    const current = useChatStore.getState().messages;
                    const updated = current.map((m) =>
                        m._id === tempId ? { ...saved, senderId: saved.senderId || user } : m
                    );
                    useChatStore.setState({ messages: updated });
                } catch {
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
            let messageType = "document";
            if (file.type.startsWith("image/")) messageType = "image";
            else if (file.type.startsWith("video/")) messageType = "video";
            else if (file.type.startsWith("audio/")) messageType = "audio";

            const formData = new FormData();
            formData.append("file", file);
            formData.append("chatId", selectedChat._id);
            formData.append("senderId", user._id);
            formData.append("messageType", messageType);
            if (caption) {
                const encrypted = await encryptMessage(caption);
                formData.append("encryptedPayload", encrypted);
            }

            setIsUploading(true);
            try {
                const msg = await sendMediaMessage(formData);
                addMessage(msg);
                toast.success("File sent!");
            } catch {
                toast.error("Failed to upload file");
            } finally {
                setIsUploading(false);
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

    // Delete chat handler
    const handleDeleteChat = useCallback(
        async (deleteType) => {
            try {
                // Map UI names to API values
                const apiDeleteType = deleteType === "mine" ? "me" : "everyone";
                await deleteChatApi(selectedChat._id, apiDeleteType);

                if (apiDeleteType === "everyone") {
                    // Full delete — remove chat from state
                    useChatStore.getState().setSelectedChat(null);
                    useChatStore.getState().setMessages([]);
                } else {
                    // Delete for me — just clear messages view, keep chat in sidebar
                    useChatStore.getState().setMessages([]);
                }

                setShowDeleteConfirm(false);
                setShowMenu(false);
                await loadChats();
                toast.success(
                    apiDeleteType === "everyone"
                        ? "Chat deleted for everyone"
                        : "Chat cleared from your side"
                );
            } catch {
                toast.error("Failed to delete chat");
            }
        },
        [selectedChat, loadChats]
    );

    // Open profile panel
    const handleOpenProfile = () => {
        setShowProfilePanel(true);
        setShowMenu(false);
    };

    // Click on user avatar/name to open profile
    const handleProfileClick = () => {
        setShowProfilePanel(true);
    };

    if (!selectedChat) return null;

    const displayMessages = chatMode === "temp" ? tempMessages : messages;

    return (
        <div className="h-full flex flex-col relative w-full" style={{ background: 'var(--panel-bg)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800/50 shrink-0 z-10">
                <div className="flex items-center gap-3 cursor-pointer" onClick={handleProfileClick}>
                    {/* Mobile back button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setMobileChatOpen(false); }}
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
                        <h2 className="text-[15px] font-bold text-gray-800 dark:text-gray-100 leading-tight font-display hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                            {otherUser.firstName} {otherUser.lastName}
                        </h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${otherUser.isOnline ? 'bg-green-400' : 'bg-gray-300'}`}></span>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                {isTyping ? (
                                    <span className="text-teal-500 font-medium animate-pulse">typing...</span>
                                ) : otherUser.isOnline ? 'Online' : 'Offline'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 relative">
                    <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <Phone size={16} />
                    </button>
                    <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <Video size={16} />
                    </button>

                    {/* Three-dot menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${showMenu
                                ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
                                : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            <MoreHorizontal size={16} />
                        </button>

                        {/* Dropdown Menu */}
                        {showMenu && (
                            <>
                                <div className="fixed inset-0 " onClick={() => setShowMenu(false)} />
                                <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 animate-scale-in overflow-hidden">
                                    <button
                                        onClick={handleOpenProfile}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-[13px] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                    >
                                        <User size={16} className="text-teal-500" />
                                        <span>View Profile</span>
                                    </button>
                                    <div className="h-px bg-gray-100 dark:bg-gray-700" />
                                    <button
                                        onClick={() => { setShowDeleteConfirm(true); setShowMenu(false); }}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                        <span>Delete All Chats</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Upload Progress Overlay */}
            {isUploading && (
                <div className="absolute top-[60px] left-0 right-0 z-20 flex items-center justify-center gap-2 py-2 bg-teal-500/90 text-white text-[13px] font-medium animate-fade-in">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Uploading file...</span>
                </div>
            )}

            {/* Messages Area — scrollable */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar relative"
                style={{ background: 'var(--bg-color)' }}
            >
                <div className="dark:hidden absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="1" fill="%23666"/></svg>')`, backgroundSize: '24px 24px' }} />

                <div className="relative z-10 flex flex-col min-h-full">
                    {/* Spacer pushes messages to bottom when few messages */}
                    <div className="flex-1 min-h-0" />

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
                        <div className="space-y-1">
                            {displayMessages.map((msg, index) => {
                                const prevMsg = displayMessages[index - 1];
                                const senderId = typeof msg.senderId === "string" ? msg.senderId : msg.senderId?._id;
                                const isMe = senderId === user?._id;
                                const prevSenderId = prevMsg ? (typeof prevMsg.senderId === "string" ? prevMsg.senderId : prevMsg.senderId?._id) : null;
                                const wasMePrev = prevMsg && prevSenderId === user?._id;
                                const isGrouped = prevMsg && isMe === wasMePrev;

                                return (
                                    <div key={msg._id || index} className={`animate-msg-fade-in ${isGrouped ? '' : 'mt-3'}`}>
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
                                <div className="flex justify-start mt-2">
                                    <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-700">
                                        <div className="flex gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <div ref={messagesEndRef} className="h-1 shrink-0" />
                </div>
            </div>

            {/* Input Area */}
            <div className="px-5 pb-4 pt-2 shrink-0 border-t border-gray-100 dark:border-gray-800/30" style={{ background: 'var(--panel-bg)' }}>
                <MessageInput
                    onSend={handleSend}
                    onTyping={handleTyping}
                    onFileUpload={handleFileUpload}
                    disabled={chatMode === "temp" && webrtcStatus !== "connected"}
                />
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm animate-scale-in overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                                <AlertTriangle size={20} className="text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-[15px] font-bold text-gray-800 dark:text-gray-100">Delete Chat</h3>
                                <p className="text-[12px] text-gray-500 dark:text-gray-400">This action cannot be undone</p>
                            </div>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <p className="px-5 py-2 text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed">
                            Are you sure you want to delete all messages in this conversation with <strong>{otherUser.firstName} {otherUser.lastName}</strong>?
                        </p>

                        {/* Actions */}
                        <div className="px-5 pb-5 pt-3 space-y-2">
                            <button
                                onClick={() => handleDeleteChat("mine")}
                                className="w-full py-2.5 rounded-xl text-[13px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Delete from my side
                            </button>
                            <button
                                onClick={() => handleDeleteChat("both")}
                                className="w-full py-2.5 rounded-xl text-[13px] font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                            >
                                Delete from both sides
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="w-full py-2.5 rounded-xl text-[13px] font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatWindow;
