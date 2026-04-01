import React, { useMemo, useState } from "react";
import { X, Image as ImageIcon, Video, FileText, ChevronDown, Mail, Phone } from "lucide-react";
import Avatar from "../common/Avatar";
import useUiStore from "../../store/uiStore";
import useChatStore from "../../store/chatStore";
import useAuthStore from "../../store/authStore";
import { getMediaUrl } from "../../services/chatService";
import { format } from "date-fns";

const MediaSection = ({ icon: Icon, label, count, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full py-2 cursor-pointer group"
            >
                <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-200">
                    <Icon size={16} className="text-gray-400" />
                    <span className="text-[13px] font-medium">
                        {label}
                        <span className="inline-flex items-center justify-center w-5 h-5 ml-1.5 text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full">
                            {count}
                        </span>
                    </span>
                </div>
                <ChevronDown
                    size={14}
                    className={`text-gray-400 group-hover:text-gray-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
            >
                {children}
            </div>
        </div>
    );
};

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

    const sharedVideos = useMemo(
        () => messages.filter((m) => m.messageType === "video" && m.mediaUrl),
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
                    <h3 className="mt-3 text-[16px] font-sm text-gray-800 dark:text-gray-100 font-display">
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

                {/* Shared Media Sections */}
                <div className="space-y-1">
                    {/* Photos */}
                    <MediaSection icon={ImageIcon} label="Photos" count={sharedMedia.length}>
                        {sharedMedia.length > 0 ? (
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
                        ) : (
                            <p className="text-[12px] text-gray-400 py-2">No shared photos yet</p>
                        )}
                        {sharedMedia.length > 8 && (
                            <button className="text-[12px] text-teal-500 font-medium hover:text-teal-600 transition-colors mb-2">
                                View All ({sharedMedia.length})
                            </button>
                        )}
                    </MediaSection>

                    <div className="h-px w-full bg-gray-100 dark:bg-gray-800/50" />

                    {/* Videos */}
                    <MediaSection icon={Video} label="Videos" count={sharedVideos.length} defaultOpen={false}>
                        {sharedVideos.length > 0 ? (
                            <div className="grid grid-cols-2 gap-1.5 pt-1 pb-3">
                                {sharedVideos.slice(0, 4).map((m) => (
                                    <div key={m._id} className="aspect-video rounded-lg overflow-hidden bg-gray-900 relative group cursor-pointer">
                                        <video
                                            src={getMediaUrl(m.mediaUrl)}
                                            preload="metadata"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                                                <span className="text-gray-800 text-[10px] font-bold">▶</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[12px] text-gray-400 py-2">No shared videos yet</p>
                        )}
                        {sharedVideos.length > 4 && (
                            <button className="text-[12px] text-teal-500 font-medium hover:text-teal-600 transition-colors mb-2">
                                View All ({sharedVideos.length})
                            </button>
                        )}
                    </MediaSection>

                    <div className="h-px w-full bg-gray-100 dark:bg-gray-800/50" />

                    {/* Documents */}
                    <MediaSection icon={FileText} label="Documents" count={sharedDocs.length} defaultOpen={false}>
                        {sharedDocs.length > 0 ? (
                            <div className="space-y-1.5 pt-1 pb-3">
                                {sharedDocs.slice(0, 5).map((m) => {
                                    const fileName = m.mediaMeta?.originalName || m.mediaMeta?.format || "File";
                                    return (
                                        <a
                                            key={m._id}
                                            href={getMediaUrl(m.mediaUrl)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                                                <FileText size={14} className="text-teal-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12px] font-medium truncate text-gray-700 dark:text-gray-200">{fileName}</p>
                                                <p className="text-[10px] text-gray-400">
                                                    {m.mediaMeta?.bytes ? `${(m.mediaMeta.bytes / 1024).toFixed(1)} KB` : ''}
                                                </p>
                                            </div>
                                        </a>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-[12px] text-gray-400 py-2">No shared documents yet</p>
                        )}
                        {sharedDocs.length > 5 && (
                            <button className="text-[12px] text-teal-500 font-medium hover:text-teal-600 transition-colors mb-2">
                                View All ({sharedDocs.length})
                            </button>
                        )}
                    </MediaSection>
                </div>
            </div>
        </div>
    );
};

export default UserProfileSidebar;
