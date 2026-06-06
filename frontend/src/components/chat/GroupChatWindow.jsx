import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, ArrowLeft, Loader2, Users, Trash2, AlertTriangle, X, Phone, Video, Eraser } from "lucide-react";
import Avatar from "../common/Avatar";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import SkeletonLoader from "../common/SkeletonLoader";
import useAuthStore from "../../store/authStore";
import useGroupStore from "../../store/groupStore";
import useUiStore from "../../store/uiStore";
import { encryptMessage } from "../../utils/encryption";
import groupService from "../../services/groupService";
import socketService from "../../services/socketService";
import { toast } from "react-hot-toast";
import useTranslation from "../../hooks/useTranslation";

const GroupChatWindow = () => {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const selectedGroup = useGroupStore((s) => s.selectedGroup);
    const messages = useGroupStore((s) => s.groupMessages);
    const messagesLoading = useGroupStore((s) => s.isLoadingMessages);
    const typingUsers = useGroupStore((s) => s.typingUsers);
    const activeGroupCalls = useGroupStore((s) => s.activeGroupCalls);

    const setMobileChatOpen = useUiStore((s) => s.setMobileChatOpen);
    const setShowProfilePanel = useUiStore((s) => s.setShowProfilePanel);
    const addGroupMessage = useGroupStore((s) => s.addGroupMessage);
    const sendGroupDbMessage = useGroupStore((s) => s.sendGroupDbMessage);

    const { translate, getTranslation, clearTranslation, isTranslating } = useTranslation();

    const scrollRef = useRef();
    const messagesEndRef = useRef();
    const [isUploading, setIsUploading] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
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
            const chatStore = await import("../../store/chatStore");
            await chatStore.default.getState().deleteMessagesForMeBatch(ids);

            useGroupStore.getState().deleteGroupMessagesForMeBatchLocal(ids);
            setSelectedMessageIds(new Set());
            setIsSelectMode(false);
            toast.success("Messages hidden");
        } catch {
            toast.error("Failed to delete messages");
        }
    };

    const handleClearChat = async () => {
        try {
            const chatStore = await import("../../store/chatStore");
            await chatStore.default.getState().clearChat(null, selectedGroup._id);

            useGroupStore.getState().clearGroupChatLocal();
            setShowClearConfirm(false);
            toast.success("Conversation cleared");
        } catch {
            toast.error("Failed to clear chat");
        }
    };

    const activeCall = useMemo(() => {
        return selectedGroup ? activeGroupCalls[selectedGroup._id] : null;
    }, [selectedGroup, activeGroupCalls]);

    const handleStartCall = useCallback((type) => {
        if (!selectedGroup) return;
        const roomName = `call_${selectedGroup._id}`;
        const groupName = encodeURIComponent(selectedGroup.groupName);

        // Emit group call init
        socketService.emit("livekit-group-call-init", {
            groupId: selectedGroup._id,
            roomName,
            type,
            callerName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username,
            groupName: selectedGroup.groupName,
        });

        // Navigate to call view
        navigate(`/call?room=${roomName}&type=${type}&recipientName=${groupName}&recipientId=${selectedGroup._id}&isGroup=true`);
    }, [selectedGroup, navigate, user]);

    const handleJoinCall = useCallback(() => {
        if (!selectedGroup || !activeCall) return;

        socketService.emit("livekit-group-call-join", {
            roomName: activeCall.roomName,
        });

        const groupName = encodeURIComponent(selectedGroup.groupName);
        navigate(`/call?room=${activeCall.roomName}&type=${activeCall.type}&recipientName=${groupName}&recipientId=${selectedGroup._id}&isGroup=true&incoming=true`);
    }, [selectedGroup, activeCall, navigate]);

    // Get active typing users (excluding self)
    const activeTypers = useMemo(() => {
        if (!selectedGroup) return [];
        const typs = typingUsers[selectedGroup._id] || [];
        return typs.filter(id => id !== user?._id);
    }, [selectedGroup, typingUsers, user?._id]);

    useEffect(() => {
        const el = scrollRef.current;
        if (el) {
            requestAnimationFrame(() => {
                el.scrollTop = el.scrollHeight;
            });
        }
    }, [messages, selectedGroup?._id]);

    const handleSend = useCallback(
        async (text) => {
            if (!text.trim() || !selectedGroup) return;

            const encrypted = await encryptMessage(text);
            const msgData = {
                groupId: selectedGroup._id,
                messageType: "text",
                encryptedPayload: encrypted,
            };

            const tempId = "temp-" + Date.now();
            addGroupMessage({
                _id: tempId,
                ...msgData,
                senderId: user,
                createdAt: new Date().toISOString(),
            });

            try {
                const saved = await sendGroupDbMessage(msgData);
                const current = useGroupStore.getState().groupMessages;
                const updated = current.map((m) =>
                    m._id === tempId ? { ...saved, senderId: saved.senderId || user } : m
                );
                useGroupStore.setState({ groupMessages: updated });
            } catch (error) {
                const current = useGroupStore.getState().groupMessages;
                useGroupStore.setState({
                    groupMessages: current.filter((m) => m._id !== tempId),
                });
                toast.error("Failed to send group message");
            }
        },
        [selectedGroup, user, addGroupMessage, sendGroupDbMessage]
    );

    const handleFileUpload = useCallback(
        async (file, caption) => {
            if (!selectedGroup) return;

            let messageType = "document";
            if (file.type.startsWith("image/")) messageType = "image";
            else if (file.type.startsWith("video/")) messageType = "video";
            else if (file.type.startsWith("audio/")) messageType = "audio";

            const formData = new FormData();
            formData.append("file", file);
            formData.append("groupId", selectedGroup._id);
            formData.append("messageType", messageType);

            if (caption) {
                const encrypted = await encryptMessage(caption);
                formData.append("encryptedPayload", encrypted);
            }

            setIsUploading(true);
            try {
                const msg = await groupService.sendGroupMediaMessage(formData);
                addGroupMessage(msg);
            } catch (error) {
                toast.error("Failed to upload file");
            } finally {
                setIsUploading(false);
            }
        },
        [selectedGroup, addGroupMessage]
    );

    const handleTyping = useCallback(
        (isTypingState) => {
        },
        [selectedGroup]
    );

    if (!selectedGroup) return null;

    return (
        <div className="h-full flex flex-col relative w-full" style={{ background: 'var(--panel-bg)' }}>
            <div className="flex items-center justify-between px-3 py-2.5 xs:px-5 xs:py-3.5 border-b border-gray-100 dark:border-gray-800/50 shrink-0 z-20">
                <div className="flex items-center gap-1.5 xs:gap-3 cursor-pointer min-w-0" onClick={() => setShowProfilePanel(true)}>
                    <button
                        onClick={(e) => { e.stopPropagation(); setMobileChatOpen(false); }}
                        className="md:hidden p-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mr-0.5 xs:mr-1 shrink-0"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <Avatar
                        src={selectedGroup.groupAvatar}
                        name={selectedGroup.groupName}
                        size="sm"
                    />
                    <div className="min-w-0">
                        <h2 className="text-[13.5px] sm:text-[15px] font-semibold sm:font-bold text-gray-800 dark:text-gray-100 leading-tight font-display hover:text-teal-600 dark:hover:text-teal-400 transition-colors truncate max-w-[90px] sm:max-w-xs block">
                            {selectedGroup.groupName}
                        </h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                {activeTypers.length > 0 ? (
                                    <span className="text-teal-500 font-medium animate-pulse">{activeTypers.length} typing...</span>
                                ) : (
                                    <span>{selectedGroup.description || 'Group Conversation'}</span>
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-1.5 relative shrink-0">
                    {activeCall ? (
                        <button
                            onClick={handleJoinCall}
                            className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] sm:text-[11px] font-bold shadow-md shadow-emerald-500/25 animate-pulse cursor-pointer border-none"
                        >
                            <Phone size={11} className="sm:w-[13px] sm:h-[13px]" fill="currentColor" />
                            <span>Join Call</span>
                        </button>
                    ) : (
                        <>
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
                        </>
                    )}

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
                        {showMenu && (
                            <>
                                <div className="fixed inset-0 " onClick={() => setShowMenu(false)} />
                                <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 animate-scale-in overflow-hidden">
                                    <button
                                        onClick={() => { setShowProfilePanel(true); setShowMenu(false); }}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-[13px] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-none bg-transparent cursor-pointer"
                                    >
                                        <Users size={16} className="text-teal-500" />
                                        <span>Group Info</span>
                                    </button>
                                    <div className="h-px bg-gray-100 dark:bg-gray-700" />
                                    <button
                                        onClick={() => { setShowClearConfirm(true); setShowMenu(false); }}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors border-none bg-transparent cursor-pointer"
                                    >
                                        <Eraser size={16} className="text-red-500" />
                                        <span>Clear Chat</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {isUploading && (
                <div className="absolute top-[60px] left-0 right-0 z-20 flex items-center justify-center gap-2 py-2 bg-teal-500/90 text-white text-[13px] font-medium animate-fade-in">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Uploading file...</span>
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

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar relative"
                style={{ background: 'var(--bg-color)' }}
            >
                <div className="relative z-10 flex flex-col min-h-full">
                    <div className="flex-1 min-h-0" />

                    {messagesLoading ? (
                        <SkeletonLoader type="messages" count={6} />
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <p className="text-[14px] font-medium mb-1">Welcome to {selectedGroup.groupName}</p>
                            <p className="text-[12px] text-gray-400/80">Send the first message to the group.</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {messages.map((msg, index) => {
                                const prevMsg = messages[index - 1];
                                const senderId = typeof msg.senderId === "string" ? msg.senderId : msg.senderId?._id;
                                const isMe = senderId === user?._id;
                                const prevSenderId = prevMsg ? (typeof prevMsg.senderId === "string" ? prevMsg.senderId : prevMsg.senderId?._id) : null;
                                const wasMePrev = prevMsg && prevSenderId === user?._id;
                                const isGrouped = prevMsg && senderId === prevSenderId;

                                // Provide a mock otherUser object for MessageBubble so names/avatars render correctly
                                const mockOtherUser = isMe ? {} : msg.senderId || {};

                                return (
                                    <div key={msg._id || index} className={`animate-msg-fade-in ${isGrouped ? '' : 'mt-3'}`}>
                                        <MessageBubble
                                            message={msg}
                                            isMe={isMe}
                                            chatMode="db"
                                            isGrouped={isGrouped}
                                            otherUser={mockOtherUser}
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
                        </div>
                    )}
                    <div ref={messagesEndRef} className="h-1 shrink-0" />
                </div>
            </div>

            <div className="px-3 pb-3 pt-2 sm:px-5 sm:pb-4 sm:pt-2 safe-bottom shrink-0 border-t border-gray-100 dark:border-gray-800/30" style={{ background: 'var(--panel-bg)' }}>
                <MessageInput
                    onSend={handleSend}
                    onTyping={handleTyping}
                    onFileUpload={handleFileUpload}
                    disabled={false}
                />
            </div>

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

export default GroupChatWindow;
