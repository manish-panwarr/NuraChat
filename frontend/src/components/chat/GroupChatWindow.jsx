import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MoreHorizontal, ArrowLeft, Loader2, Users, Trash2, AlertTriangle, X } from "lucide-react";
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

const GroupChatWindow = () => {
    const user = useAuthStore((s) => s.user);
    const selectedGroup = useGroupStore((s) => s.selectedGroup);
    const messages = useGroupStore((s) => s.groupMessages);
    const messagesLoading = useGroupStore((s) => s.isLoadingMessages);
    const typingUsers = useGroupStore((s) => s.typingUsers);
    
    const setMobileChatOpen = useUiStore((s) => s.setMobileChatOpen);
    const setShowProfilePanel = useUiStore((s) => s.setShowProfilePanel);
    const addGroupMessage = useGroupStore((s) => s.addGroupMessage);
    const sendGroupDbMessage = useGroupStore((s) => s.sendGroupDbMessage);

    const scrollRef = useRef();
    const messagesEndRef = useRef();
    const [isUploading, setIsUploading] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

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

            // TODO: Here we should technically encrypt with group's encryptionSalt
            // But since encryption utility currently uses user's auth token for derivation in a real E2E, 
            // we'll pass the group salt explicitly if the utility supports it, or just use the default.
            // For now, assume encryptMessage handles it or we'll wrap it.
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
                // Update temp msg in store handled locally or refetched
                // Simple implementation doesn't specifically replace temp, it relies on socket bounce
            } catch (error) {
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
                // socket event handles distribution
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
            // Group typing not yet wired in socket globally, but would emit to groupId
            // socketService.emit("group-typing", { groupId: selectedGroup._id, isTyping: isTypingState });
        },
        [selectedGroup]
    );

    if (!selectedGroup) return null;

    return (
        <div className="h-full flex flex-col relative w-full" style={{ background: 'var(--panel-bg)' }}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800/50 shrink-0 z-10">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowProfilePanel(true)}>
                    <button
                        onClick={(e) => { e.stopPropagation(); setMobileChatOpen(false); }}
                        className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mr-1"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <Avatar
                        src={selectedGroup.groupAvatar}
                        name={selectedGroup.groupName}
                        size="md"
                    />
                    <div>
                        <h2 className="text-[15px] font-bold text-gray-800 dark:text-gray-100 leading-tight font-display hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
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

                <div className="flex items-center gap-1.5 relative">
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
                        {showMenu && (
                            <>
                                <div className="fixed inset-0 " onClick={() => setShowMenu(false)} />
                                <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 animate-scale-in overflow-hidden">
                                    <button
                                        onClick={() => { setShowProfilePanel(true); setShowMenu(false); }}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-[13px] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                    >
                                        <Users size={16} className="text-teal-500" />
                                        <span>Group Info</span>
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
                            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center mb-3 shadow-sm">
                                <span className="text-2xl">👋</span>
                            </div>
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
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div ref={messagesEndRef} className="h-1 shrink-0" />
                </div>
            </div>

            <div className="px-5 pb-4 pt-2 shrink-0 border-t border-gray-100 dark:border-gray-800/30" style={{ background: 'var(--panel-bg)' }}>
                <MessageInput
                    onSend={handleSend}
                    onTyping={handleTyping}
                    onFileUpload={handleFileUpload}
                    disabled={false}
                />
            </div>
        </div>
    );
};

export default GroupChatWindow;
