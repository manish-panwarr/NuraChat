import React, { useMemo } from "react";
import { X, Image as ImageIcon, Music, Video, FileText, ChevronDown, Mail, Phone, Calendar, MapPin } from "lucide-react";
import Avatar from "../common/Avatar";
import useUiStore from "../../store/uiStore";
import useChatStore from "../../store/chatStore";
import useAuthStore from "../../store/authStore";
import { getMediaUrl } from "../../services/chatService";
import { format } from "date-fns";

const UserProfileSidebar = () => {
    const user = useAuthStore((s) => s.user);
    const selectedChat = useChatStore((s) => s.selectedChat);
    const messages = useChatStore((s) => s.messages);
    const showProfilePanel = useUiStore((s) => s.showProfilePanel);
    const setShowProfilePanel = useUiStore((s) => s.setShowProfilePanel);

    const otherUser = useMemo(
        () => selectedChat?.participants?.find((p) => p._id !== user?._id) || {},
        [selectedChat, user?._id]
    );

    const sharedMedia = useMemo(
        () => messages.filter((m) => m.messageType === "image" && m.mediaUrl),
        [messages]
    );

    const sharedDocs = useMemo(
        () => messages.filter((m) => (m.messageType === "document" || m.messageType === "audio") && m.mediaUrl),
        [messages]
    );

    if (!showProfilePanel || !selectedChat) return null;

    return (
        <div className="flex flex-col h-full" style={{ background: 'var(--panel-bg)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 tracking-tight font-display">Contact Info</h2>
                <button
                    onClick={() => setShowProfilePanel(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                    <X size={14} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-5">
                {/* Profile Section */}
                <div className="flex flex-col items-center pb-5 border-b border-gray-100 dark:border-gray-800/50 mb-4">
                    <Avatar
                        src={otherUser.profileImage}
                        name={`${otherUser.firstName || ""} ${otherUser.lastName || ""}`}
                        isOnline={otherUser.isOnline}
                        size="xl"
                    />
                    <h3 className="mt-3 text-[16px] font-bold text-gray-800 dark:text-gray-100 font-display">
                        {otherUser.firstName} {otherUser.lastName}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                        <span className={`w-2 h-2 rounded-full ${otherUser.isOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
                        <span className="text-[12px] text-gray-500 dark:text-gray-400">
                            {otherUser.isOnline ? 'Online' : otherUser.lastSeen ? `Last seen ${format(new Date(otherUser.lastSeen), "MMM d, h:mm a")}` : 'Offline'}
                        </span>
                    </div>
                    {otherUser.statusText && (
                        <p className="text-[12px] text-gray-400 italic mt-2 text-center max-w-[200px]">
                            "{otherUser.statusText}"
                        </p>
                    )}
                </div>

                {/* Contact Details */}
                <div className="space-y-3 mb-5">
                    {otherUser.email && (
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                <Mail size={14} className="text-gray-400" />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Email</p>
                                <p className="text-[12px] text-gray-700 dark:text-gray-200">{otherUser.email}</p>
                            </div>
                        </div>
                    )}
                    {otherUser.mobileNumber && (
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                <Phone size={14} className="text-gray-400" />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Phone</p>
                                <p className="text-[12px] text-gray-700 dark:text-gray-200">{otherUser.mobileNumber}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-px w-full bg-gray-100 dark:bg-gray-800/50 mb-4" />

                {/* Shared Media */}
                <div className="space-y-2">
                    {/* Photos */}
                    <div>
                        <div className="flex items-center justify-between py-2 cursor-pointer group">
                            <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-200">
                                <ImageIcon size={16} className="text-gray-400" />
                                <span className="text-[13px] font-medium">
                                    Photos <span className="text-gray-400 text-[11px] ml-1">• {sharedMedia.length}</span>
                                </span>
                            </div>
                            <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600 transition" />
                        </div>
                        {sharedMedia.length > 0 && (
                            <div className="grid grid-cols-4 gap-1.5 pt-1 pb-3">
                                {sharedMedia.slice(0, 8).map((m) => (
                                    <div key={m._id} className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                        <img
                                            src={getMediaUrl(m.mediaUrl)}
                                            alt=""
                                            className="w-full h-full object-cover hover:opacity-90 transition-opacity cursor-pointer"
                                            loading="lazy"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="h-px w-full bg-gray-100 dark:bg-gray-800/50" />

                    {/* Documents */}
                    <div className="flex items-center justify-between py-2 cursor-pointer group">
                        <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-200">
                            <FileText size={16} className="text-gray-400" />
                            <span className="text-[13px] font-medium">
                                Documents <span className="text-gray-400 text-[11px] ml-1">• {sharedDocs.length}</span>
                            </span>
                        </div>
                        <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600 transition" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfileSidebar;
