import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, Video, MoreHorizontal, ArrowLeft, Loader2, User, Trash2, AlertTriangle, X, Zap, Database, Info, ShieldOff, Eraser } from "lucide-react";
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
import useTranslation from "../../hooks/useTranslation";

const ChatWindow = () => {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const selectedChat = useChatStore((s) => s.selectedChat);
    const messages = useChatStore((s) => s.messages);

    const otherUser = useMemo(
        () => selectedChat?.participants?.find((p) => p._id !== user?._id) || {},
        [selectedChat, user?._id]
    );

    const onlineUsers = useChatStore((s) => s.onlineUsers);
    const tempModePending = useChatStore((s) => s.tempModePending);
    const setTempModePending = useChatStore((s) => s.setTempModePending);

    const handleStartCall = useCallback((type) => {
        if (!selectedChat || !otherUser?._id) return;
        if (!onlineUsers || !onlineUsers.has(otherUser._id)) {
            toast.error("User is not online, try to call after few moments when user will be online.");
            return;
        }
        const roomName = `call_${selectedChat._id}`;
        const recipientName = encodeURIComponent(`${otherUser.firstName || ""} ${otherUser.lastName || ""}`.trim());
        navigate(`/call?room=${roomName}&type=${type}&recipientName=${recipientName}&recipientId=${otherUser._id}`);
    }, [selectedChat, otherUser, navigate, onlineUsers]);
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
        setChatMode,
    } = useChat();

    const { translate, getTranslation, clearTranslation, isTranslating } = useTranslation();

    const scrollRef = useRef();
    const messagesEndRef = useRef();
    const [isUploading, setIsUploading] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = useState(new Set());

    const handleToggleSelectMessage = useCallback((messageId) => {
        setIsSelectMode(true);
        setSelectedMessageIds((prev) => {
            const next = new Set(prev);
            if (next.has(messageId)) {
                next.delete(messageId);
            } else {
                next.add(messageId);
            }
            return next;
        });
    }, []);

    const handleBatchDelete = async () => {
        const ids = Array.from(selectedMessageIds);
        if (ids.length === 0) return;
        const confirmDelete = window.confirm(`Delete ${ids.length} selected message(s) for you?`);
        if (!confirmDelete) return;

        try {
            await useChatStore.getState().deleteMessagesForMeBatch(ids);
            setSelectedMessageIds(new Set());
            setIsSelectMode(false);
            toast.success("Messages hidden");
        } catch {
            toast.error("Failed to delete messages");
        }
    };

    const handleClearChat = async () => {
        try {
            await useChatStore.getState().clearChat(selectedChat._id, null);
            setShowClearConfirm(false);
            toast.success("Conversation cleared");
        } catch {
            toast.error("Failed to clear chat");
        }
    };



    const isTyping = useMemo(
        () => selectedChat && typingUsers[selectedChat._id] === otherUser._id,
        [selectedChat, typingUsers, otherUser._id]
    );

    // Always scroll to bottom on new messages or chat change
    useEffect(() => {
        const el = scrollRef.current;
        if (el) {
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

    // Toggle temp mode with online check and invitation request
    const handleToggleTempMode = useCallback(() => {
        if (chatMode === "temp") {
            // Switch back to DB mode
            setChatMode("db");
            toast.success("Switched to DB mode — messages will be stored.");
            // Notify peer
            socketService.emit("temp-mode-off", { to: otherUser._id });
            return;
        }
        // Check if other user is online
        if (!onlineUsers || !onlineUsers.has(otherUser._id)) {
            toast.error(
                `${otherUser.firstName || "User"} is not available. Shifting to DB message.`,
                { icon: "", duration: 4000 }
            );
            setChatMode("db");
            return;
        }
        setTempModePending(true);
        socketService.emit("temp-mode-request", {
            to: otherUser._id,
            fromName: `${user.firstName || ""} ${user.lastName || ""}`.trim()
        });
        toast.loading("Sending Temporary chat invitation...", { id: "temp-mode-req", duration: 3000 });
    }, [chatMode, otherUser, setChatMode, onlineUsers, setTempModePending, user]);

    // Watch for other user going offline while in temp mode
    useEffect(() => {
        const isOnline = onlineUsers && onlineUsers.has(otherUser._id);
        if (chatMode === "temp" && !isOnline) {
            setChatMode("db");
            toast(
                `${otherUser.firstName || "User"} went offline. Shifted to DB mode.`,
                { icon: "", duration: 4000 }
            );
        }
    }, [chatMode, onlineUsers, otherUser._id, otherUser.firstName, setChatMode]);

    const handleSend = useCallback(
        async (text) => {
            if (!text.trim()) return;

            if (chatMode === "temp") {
                // Send via socket P2P relay (no DB storage)
                const msgData = {
                    _id: "temp-" + Date.now() + Math.random(),
                    senderId: user,
                    messageType: "text",
                    encryptedPayload: text,
                    createdAt: new Date().toISOString(),
                    chatId: selectedChat._id,
                };
                addTempMessage(msgData);
                socketService.emit("temp-message", {
                    to: otherUser._id,
                    message: msgData,
                });
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
        [chatMode, user, selectedChat, otherUser._id, addMessage, sendDbMessage, addTempMessage]
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
                if (deleteType === "mine") {
                    // Client-side only — clear messages from view, no DB call
                    useChatStore.getState().setMessages([]);
                    useChatStore.getState().setTempMessages([]);
                    setShowDeleteConfirm(false);
                    setShowMenu(false);
                    toast.success("Chat cleared from your side");
                    return;
                }

                // delete data fron both side
                await deleteChatApi(selectedChat._id, "everyone");
                useChatStore.getState().setSelectedChat(null);
                useChatStore.getState().setMessages([]);
                useChatStore.getState().setTempMessages([]);
                setShowDeleteConfirm(false);
                setShowMenu(false);
                await loadChats();
                toast.success("Chat deleted for everyone");
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
            <div className="flex items-center justify-between px-3 py-2.5 xs:px-5 xs:py-3.5 border-b border-gray-100 dark:border-gray-800/50 shrink-0 z-20">
                <div className="flex items-center gap-1.5 xs:gap-3 cursor-pointer min-w-0" onClick={handleProfileClick}>
                    {/* Mobile back button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setMobileChatOpen(false); }}
                        className="md:hidden p-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mr-0.5 xs:mr-1 shrink-0"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <Avatar
                        src={otherUser.profileImage}
                        name={`${otherUser.firstName || ""} ${otherUser.lastName || ""}`}
                        isOnline={onlineUsers && onlineUsers.has(otherUser._id)}
                        size="sm"
                    />
                    <div className="min-w-0">
                        <h2 className="text-[13.5px] sm:text-[15px] font-semibold sm:font-bold text-gray-800 dark:text-gray-100 leading-tight font-display hover:text-teal-600 dark:hover:text-teal-400 transition-colors truncate max-w-[90px] sm:max-w-xs block" title={`${otherUser.firstName || ""} ${otherUser.lastName || ""}`}>
                            {otherUser.firstName} {otherUser.lastName}
                        </h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${onlineUsers && onlineUsers.has(otherUser._id) ? 'bg-green-400' : 'bg-gray-300'}`}></span>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                {isTyping ? (
                                    <span className="text-teal-500 font-medium animate-pulse">typing...</span>
                                ) : (onlineUsers && onlineUsers.has(otherUser._id)) ? 'Online' : 'Offline'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-1.5 relative shrink-0">
                    {/* Temp/DB Mode Toggle */}
                    <button
                        onClick={handleToggleTempMode}
                        title={chatMode === "temp" ? "Switch to DB mode (messages stored)" : "Switch to Temp mode (P2P, not stored)"}
                        className={`h-8 px-2 sm:h-9 sm:px-2.5 flex items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer ${chatMode === "temp"
                            ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50"
                            : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent"
                            }`}
                    >
                        {chatMode === "temp" ? <Zap size={12} className="sm:w-[13px] sm:h-[13px]" /> : <Database size={12} className="sm:w-[13px] sm:h-[13px]" />}
                    </button>

                    <button
                        onClick={() => handleStartCall("audio")}
                        className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg sm:rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer border-none"
                    >
                        <Phone size={14} className="sm:w-4 sm:h-4" />
                    </button>
                    <button
                        onClick={() => handleStartCall("video")}
                        className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg sm:rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer border-none"
                    >
                        <Video size={14} className="sm:w-4 sm:h-4" />
                    </button>

                    {/* Three-dot menu extra settings*/}
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg sm:rounded-xl transition-colors ${showMenu
                                ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
                                : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            <MoreHorizontal size={14} className="sm:w-4 sm:h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {showMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
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
                                        onClick={() => { setShowClearConfirm(true); setShowMenu(false); }}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors border-none bg-transparent cursor-pointer"
                                    >
                                        <Eraser size={16} className="text-red-500" />
                                        <span>Clear Chat</span>
                                    </button>
                                    <div className="h-px bg-gray-100 dark:bg-gray-700" />
                                    <button
                                        onClick={() => { setShowDeleteConfirm(true); setShowMenu(false); }}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors border-none bg-transparent cursor-pointer"
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

            {/* Temp Mode Info Banner */}
            {chatMode === "temp" && (
                <div className="flex items-center gap-2.5 px-4 py-2.5 mx-0 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200/60 dark:border-amber-700/40 text-amber-700 dark:text-amber-300 text-[12px] font-medium animate-fade-in shrink-0 z-10">
                    <ShieldOff size={15} className="shrink-0 text-amber-500" />
                    <span>You're using <strong>Temp Mode (P2P)</strong> — messages are sent directly and <strong>will not be stored</strong>. They'll disappear when you leave this chat.</span>
                </div>
            )}

            {/* Selection Action Bar */}
            {isSelectMode && (
                <div className="flex items-center justify-between px-5 py-3 bg-teal-50 dark:bg-teal-950/20 border-b border-teal-100 dark:border-teal-900/30 shrink-0 z-10 animate-slide-down">
                    <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-teal-800 dark:text-teal-300">
                            Selected: {selectedMessageIds.size}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleBatchDelete}
                            disabled={selectedMessageIds.size === 0}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-[12px] font-semibold transition-colors border-none cursor-pointer"
                        >
                            <Trash2 size={13} />
                            <span>Delete Selected</span>
                        </button>
                        <button
                            onClick={() => {
                                setIsSelectMode(false);
                                setSelectedMessageIds(new Set());
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors border-none cursor-pointer text-[12px] font-semibold"
                        >
                            <X size={13} />
                            <span>Cancel</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar relative"
                style={{ background: 'var(--bg-color)' }}
            >
                <div className="dark:hidden absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="1" fill="%23666"/></svg>')`, backgroundSize: '24px 24px' }} />

                <div className="relative z-10 flex flex-col min-h-full">
                    <div className="flex-1 min-h-0" />

                    {messagesLoading ? (
                        <SkeletonLoader type="messages" count={6} />
                    ) : displayMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
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
                                            isSelectMode={isSelectMode}
                                            isSelected={selectedMessageIds.has(msg._id)}
                                            onToggleSelect={handleToggleSelectMessage}
                                            onTranslate={(messageId, text) => {
                                                if (text === null) {
                                                    clearTranslation(messageId);
                                                } else {
                                                    translate(messageId, text);
                                                }
                                            }}
                                            translationData={getTranslation(msg._id)}
                                            isTranslating={isTranslating}
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
            <div className="px-3 pb-3 pt-2 sm:px-5 sm:pb-4 sm:pt-3 safe-bottom shrink-0 border-t border-gray-100 dark:border-gray-800/30" style={{ background: 'var(--panel-bg)' }}>
                {tempModePending ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-700/30 rounded-2xl animate-fade-in">
                        <div className="flex items-center gap-2.5 text-[13px] font-medium text-amber-700 dark:text-amber-300">
                            <Loader2 className="animate-spin text-amber-500" size={15} />
                            <span>Waiting for <strong>{otherUser.firstName}</strong> to accept Temporary Mode request...</span>
                        </div>
                        <button
                            onClick={() => {
                                setTempModePending(false);
                                socketService.emit("temp-mode-declined", { to: otherUser._id });
                                toast.dismiss("temp-mode-req");
                                toast("Invitation cancelled", { icon: "✕" });
                            }}
                            className="px-3.5 py-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60 rounded-xl text-[12px] font-semibold transition-colors cursor-pointer border-none"
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <MessageInput
                        onSend={handleSend}
                        onTyping={handleTyping}
                        onFileUpload={handleFileUpload}
                        disabled={false}
                    />
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm animate-scale-in overflow-hidden">
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
            {/* Clear Chat Confirmation Modal */}
            {showClearConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowClearConfirm(false)} />
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm animate-scale-in overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                                <AlertTriangle size={20} className="text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-[15px] font-bold text-gray-800 dark:text-gray-100 font-display">Clear Chat?</h3>
                                <p className="text-[12px] text-gray-500 dark:text-gray-400">This will remove all messages from your view only.</p>
                            </div>
                            <button
                                onClick={() => setShowClearConfirm(false)}
                                className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-none bg-transparent cursor-pointer"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="px-5 pb-5 pt-3 flex gap-3">
                            <button
                                onClick={() => setShowClearConfirm(false)}
                                className="flex-1 py-2.5 rounded-xl text-[13px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border-none cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleClearChat}
                                className="flex-1 py-2.5 rounded-xl text-[13px] font-medium bg-red-500 text-white hover:bg-red-600 transition-colors border-none cursor-pointer"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatWindow;
