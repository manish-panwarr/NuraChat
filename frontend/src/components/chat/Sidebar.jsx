import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Search, Pin, MessageCirclePlus, RefreshCw } from "lucide-react";
import Avatar from "../common/Avatar";
import SkeletonLoader from "../common/SkeletonLoader";
import useChat from "../../hooks/useChat";
import useChatStore from "../../store/chatStore";
import useAuthStore from "../../store/authStore";
import useUiStore from "../../store/uiStore";
import { decryptMessage } from "../../utils/encryption";
import { searchUsers, createChat } from "../../services/chatService";
import userService from "../../services/userService";
import { toast } from "react-hot-toast";

const Sidebar = () => {
    const user = useAuthStore((s) => s.user);
    const pinnedChats = useChatStore((s) => s.pinnedChats);
    const togglePin = useChatStore((s) => s.togglePin);
    const setMobileChatOpen = useUiStore((s) => s.setMobileChatOpen);
    const setShowProfilePanel = useUiStore((s) => s.setShowProfilePanel);
    const sidebarTab = useUiStore((s) => s.sidebarTab);
    const setSidebarTab = useUiStore((s) => s.setSidebarTab);

    const {
        chats,
        chatLoading,
        selectedChat,
        selectChat,
        unreadCounts,
        loadChats,
    } = useChat();

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [debounceTimer, setDebounceTimer] = useState(null);
    const [discoveryUsers, setDiscoveryUsers] = useState([]);
    const [isDiscoveryMode, setIsDiscoveryMode] = useState(false);
    const [isDiscoveryLoading, setIsDiscoveryLoading] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    useEffect(() => {
        loadChats();
    }, [loadChats]);

    // Quick access — ONLY users who are online AND have an existing chat
    const onlineChattedUsers = useMemo(() => {
        return chats
            .map(chat => chat.participants?.find(p => p._id !== user?._id))
            .filter(other => other && other.isOnline)
            .slice(0, 8);
    }, [chats, user?._id]);

    const fetchDiscoveryUsers = async () => {
        setIsDiscoveryLoading(true);
        try {
            const randomUsers = await userService.fetchRandomUsers(7);
            
            // Filter out users we already have a chat with to maximize discovery
            const existingChatUserIds = new Set(
                chats.map(c => c.participants?.find(p => p._id !== user?._id)?._id).filter(Boolean)
            );
            
            let filtered = randomUsers.filter(u => !existingChatUserIds.has(u._id));
            if (filtered.length < 3 && randomUsers.length > 0) {
                // If filtering removed almost everyone, just show the random users anyway
                filtered = randomUsers;
            }
            
            setDiscoveryUsers(filtered);
        } catch (err) {
            console.error("Failed to fetch discovery users", err);
        } finally {
            setIsDiscoveryLoading(false);
        }
    };

    // When "New Chat" is clicked, fetch random users
    const handleNewChat = useCallback(() => {
        setIsDiscoveryMode(true);
        setSearchQuery("");
        setSearchResults([]);
        fetchDiscoveryUsers();
    }, [chats, user?._id]);

    // Refresh discovery users
    const handleRefreshDiscovery = () => {
        fetchDiscoveryUsers();
    };

    // Debounced search
    const handleSearch = useCallback(
        (query) => {
            setSearchQuery(query);
            if (debounceTimer) clearTimeout(debounceTimer);

            if (!query.trim()) {
                setSearchResults([]);
                setIsSearching(false);
                return;
            }

            // Exit discovery mode when searching
            setIsDiscoveryMode(false);

            setIsSearching(true);
            const timer = setTimeout(async () => {
                try {
                    const results = await searchUsers(query);
                    const filtered = Array.isArray(results)
                        ? results.filter((u) => u._id !== user?._id)
                        : [];
                    setSearchResults(filtered);
                } catch {
                    setSearchResults([]);
                } finally {
                    setIsSearching(false);
                }
            }, 300);
            setDebounceTimer(timer);
        },
        [debounceTimer, user?._id]
    );

    // Filter chats based on search
    const filteredChats = useMemo(() => {
        if (!searchQuery.trim()) return chats;
        return chats.filter((chat) => {
            const other = chat.participants?.find((p) => p._id !== user?._id) || {};
            const name = `${other.firstName || ""} ${other.lastName || ""}`.toLowerCase();
            return name.includes(searchQuery.toLowerCase());
        });
    }, [chats, searchQuery, user?._id]);

    const pinnedChatsList = useMemo(
        () => filteredChats.filter((chat) => pinnedChats.has(chat._id)),
        [filteredChats, pinnedChats]
    );

    const onlineChats = useMemo(
        () =>
            filteredChats.filter((chat) => {
                const other = chat.participants?.find((p) => p._id !== user?._id);
                return other?.isOnline && !pinnedChats.has(chat._id);
            }),
        [filteredChats, user?._id, pinnedChats]
    );

    const offlineChats = useMemo(
        () =>
            filteredChats.filter((chat) => {
                const other = chat.participants?.find((p) => p._id !== user?._id);
                return !other?.isOnline && !pinnedChats.has(chat._id);
            }),
        [filteredChats, user?._id, pinnedChats]
    );

    const handleStartChat = async (targetUser) => {
        try {
            const chat = await createChat(targetUser._id);
            setSearchQuery("");
            setSearchResults([]);
            setIsDiscoveryMode(false);
            await loadChats();
            selectChat(chat);
            setMobileChatOpen(true);
            setShowProfilePanel(true);
        } catch (err) {
            const existing = chats.find((c) =>
                c.participants?.some((p) => p._id === targetUser._id)
            );
            if (existing) {
                selectChat(existing);
                setSearchQuery("");
                setSearchResults([]);
                setIsDiscoveryMode(false);
                setMobileChatOpen(true);
                setShowProfilePanel(true);
            } else {
                toast.error(err.response?.data?.message || "Failed to start chat");
            }
        }
    };

    const handleSelectChat = (chat) => {
        selectChat(chat);
        setMobileChatOpen(true);
        setShowProfilePanel(true);
        setIsDiscoveryMode(false);
    };

    if (sidebarTab === "group") {
        return null; // Will be handled by a higher logic component
    }

    return (
        <div className="flex flex-col h-full" style={{ background: 'var(--panel-bg)' }}>
            {/* Header & Tabs */}
            <div className="flex flex-col px-5 pt-5 pb-3 gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 tracking-tight font-display">Messages</h2>
                    <button
                        onClick={handleNewChat}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 hover:text-teal-500 transition-colors" title="New chat"
                    >
                        <MessageCirclePlus size={15} />
                    </button>
                </div>

                <div className="flex bg-gray-100 dark:bg-gray-800/80 p-0.5 rounded-lg w-full">
                    <button
                        onClick={() => setSidebarTab("private")}
                        className={`flex-1 flex justify-center py-1.5 text-[12px] font-medium rounded-md transition-all ${
                            sidebarTab === "private"
                                ? "bg-white dark:bg-gray-700 text-teal-600 dark:text-teal-400 shadow-sm"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                    >
                        Private
                    </button>
                    <button
                        onClick={() => setSidebarTab("group")}
                        className={`flex-1 flex justify-center py-1.5 text-[12px] font-medium rounded-md transition-all ${
                            sidebarTab === "group"
                                ? "bg-white dark:bg-gray-700 text-teal-600 dark:text-teal-400 shadow-sm"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                    >
                        Groups
                    </button>
                </div>
            </div>

            {/* Quick Access — Online & Chatted Users Only */}
            {onlineChattedUsers.length > 0 && !isDiscoveryMode && (
                <div className="px-5 flex gap-2.5 overflow-x-auto custom-scrollbar pb-2 mb-1">
                    {onlineChattedUsers.map(other => (
                        <div
                            key={other._id}
                            className="relative cursor-pointer shrink-0 group"
                            onClick={() => {
                                const chat = chats.find(c => c.participants?.some(p => p._id === other._id));
                                if (chat) handleSelectChat(chat);
                            }}
                            title={`${other.firstName} ${other.lastName || ""}`}
                        >
                            <Avatar src={other.profileImage} name={(other.firstName || "") + " " + (other.lastName || "")} size="md" isOnline={true} />
                        </div>
                    ))}
                </div>
            )}

            {/* Search Bar */}
            <div className="px-5 pb-2">
                <div className="relative flex items-center bg-gray-50 dark:bg-gray-800/60 rounded-xl px-3.5 py-2 border border-gray-100 dark:border-gray-700/50 focus-within:border-gray-300 dark:focus-within:border-gray-600 transition-all">
                    <Search size={15} className="text-gray-400 shrink-0" />
                    <input
                        type="text"
                        placeholder="Search users or messages"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                        className="w-full bg-transparent pl-2.5 text-[13px] outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400"
                    />
                    {isSearching && (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-teal-500 rounded-full animate-spin shrink-0" />
                    )}
                    {isDiscoveryMode && !searchQuery && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsDiscoveryMode(false); }}
                            className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0 ml-1"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Chat Lists Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pt-1 pb-3 space-y-3">

                {/* Discovery Mode — Random Users */}
                {isDiscoveryMode && !searchQuery && discoveryUsers.length > 0 && (
                    <div className="space-y-0.5 animate-fade-in-up">
                        <div className="px-2 flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Discover People</span>
                                <span className="bg-teal-50 dark:bg-teal-900/30 text-teal-500 text-[10px] w-4.5 h-4.5 flex items-center justify-center rounded-full font-bold">{discoveryUsers.length}</span>
                            </div>
                            <button
                                onClick={handleRefreshDiscovery}
                                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-teal-500 transition-colors"
                                title="Show different users"
                            >
                                <RefreshCw size={12} />
                            </button>
                        </div>
                        {isDiscoveryLoading ? (
                            <div className="flex justify-center py-4">
                                <div className="w-4 h-4 border-2 border-gray-300 border-t-teal-500 rounded-full animate-spin shrink-0" />
                            </div>
                        ) : (
                            discoveryUsers.map((u) => (
                                <SearchResultItem key={u._id} user={u} onStart={() => handleStartChat(u)} />
                            ))
                        )}
                    </div>
                )}

                {/* Search Results */}
                {searchQuery && searchResults.length > 0 && (
                    <div className="space-y-0.5">
                        <div className="px-2 flex items-center gap-2 mb-1.5">
                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Search Results</span>
                        </div>
                        {searchResults.map((u) => (
                            <SearchResultItem key={u._id} user={u} onStart={() => handleStartChat(u)} />
                        ))}
                    </div>
                )}

                {searchQuery && searchResults.length === 0 && !isSearching && (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                        <Search size={28} strokeWidth={1.3} className="mb-2 opacity-40" />
                        <p className="text-[13px]">No users found</p>
                    </div>
                )}

                {/* Pinned Group */}
                {!searchQuery && !isDiscoveryMode && pinnedChatsList.length > 0 && (
                    <div className="space-y-0.5">
                        <div className="px-2 flex items-center gap-2 mb-1.5">
                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Pinned</span>
                            <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 text-[10px] w-4.5 h-4.5 flex items-center justify-center rounded-full font-bold">{pinnedChatsList.length}</span>
                        </div>
                        {pinnedChatsList.map((chat) => (
                            <ChatItem
                                key={chat._id}
                                chat={chat}
                                currentUserId={user?._id}
                                isSelected={selectedChat?._id === chat._id}
                                unreadCount={unreadCounts[chat._id] || 0}
                                onSelect={() => handleSelectChat(chat)}
                                isPinned={true}
                                onTogglePin={(e) => { e.stopPropagation(); togglePin(chat._id); }}
                            />
                        ))}
                    </div>
                )}

                {/* All Messages */}
                {!searchQuery && !isDiscoveryMode && (onlineChats.length > 0 || offlineChats.length > 0) && (
                    <div className="space-y-0.5">
                        <div className="px-2 flex items-center gap-2 mb-1.5">
                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">All Messages</span>
                        </div>

                        {onlineChats.map((chat) => (
                            <ChatItem
                                key={chat._id}
                                chat={chat}
                                currentUserId={user?._id}
                                isSelected={selectedChat?._id === chat._id}
                                unreadCount={unreadCounts[chat._id] || 0}
                                onSelect={() => handleSelectChat(chat)}
                                isPinned={false}
                                onTogglePin={(e) => { e.stopPropagation(); togglePin(chat._id); }}
                            />
                        ))}

                        {offlineChats.map((chat) => (
                            <ChatItem
                                key={chat._id}
                                chat={chat}
                                currentUserId={user?._id}
                                isSelected={selectedChat?._id === chat._id}
                                unreadCount={unreadCounts[chat._id] || 0}
                                onSelect={() => handleSelectChat(chat)}
                                isPinned={false}
                                onTogglePin={(e) => { e.stopPropagation(); togglePin(chat._id); }}
                            />
                        ))}
                    </div>
                )}

                {/* Empty States */}
                {!searchQuery && !isDiscoveryMode && !chatLoading && chats.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                        <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-3">
                            <MessageCirclePlus size={24} strokeWidth={1.3} className="text-teal-400" />
                        </div>
                        <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 mb-1">No conversations yet</p>
                        <p className="text-[12px] text-gray-400">Search for a user to start chatting</p>
                    </div>
                )}

                {chatLoading && (
                    <div className="px-1">
                        <SkeletonLoader type="chat-list" count={4} />
                    </div>
                )}

            </div>
        </div>
    );
};

/* ----- Search Result Item ----- */
const SearchResultItem = ({ user, onStart }) => (
    <button
        onClick={onStart}
        className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left group"
    >
        <Avatar
            src={user.profileImage}
            name={`${user.firstName || ""} ${user.lastName || ""}`}
            isOnline={user.isOnline}
            size="sm"
        />
        <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-[13px] text-gray-800 dark:text-gray-200 truncate">
                {user.firstName} {user.lastName}
            </h4>
            <p className="text-[11px] text-gray-400 truncate mt-0.5">{user.email}</p>
        </div>
        <span className="text-[11px] text-teal-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            Chat →
        </span>
    </button>
);

/* ----- ChatItem Sub-component ----- */
const ChatItem = ({ chat, currentUserId, isSelected, unreadCount, onSelect, isPinned, onTogglePin }) => {
    const other = chat.participants?.find((p) => p._id !== currentUserId) || {};
    const lastMsg = chat.lastMessageId;
    const [previewText, setPreviewText] = useState("");

    useEffect(() => {
        if (!lastMsg) {
            setPreviewText("Start a conversation");
            return;
        }
        if (lastMsg.encryptedPayload) {
            let mounted = true;
            decryptMessage(lastMsg.encryptedPayload)
                .then((text) => mounted && setPreviewText(text))
                .catch(() => mounted && setPreviewText("Message"));
            return () => { mounted = false; };
        } else if (lastMsg.mediaUrl) {
            setPreviewText("📎 Media");
        } else {
            setPreviewText(lastMsg.content || "Message");
        }
    }, [lastMsg]);

    const formatTime = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        const now = new Date();
        if (d.toDateString() === now.toDateString()) {
            return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        }
        const diff = now - d;
        if (diff < 7 * 24 * 60 * 60 * 1000) {
            return d.toLocaleDateString([], { weekday: "short" });
        }
        return d.toLocaleDateString([], { month: "short", day: "numeric" });
    };

    return (
        <div
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-150 group relative cursor-pointer ${isSelected
                ? "bg-gray-100 dark:bg-gray-800/70"
                : "hover:bg-gray-50 dark:hover:bg-gray-800/30"
                }`}
            onClick={onSelect}
        >
            <Avatar
                src={other.profileImage}
                name={`${other.firstName || ""} ${other.lastName || ""}`}
                isOnline={other.isOnline}
                size="sm"
            />
            <div className="flex-1 min-w-0 pr-5">
                <div className="flex justify-between items-center mb-0.5">
                    <h4 className={`font-semibold text-[13px] truncate ${isSelected ? "text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-200"
                        }`}>
                        {other.firstName} {other.lastName}
                    </h4>
                </div>
                <p className={`text-[12px] truncate ${unreadCount > 0
                    ? "text-gray-800 dark:text-gray-200 font-medium"
                    : "text-gray-400 dark:text-gray-500"
                    }`}>
                    {previewText.length > 30 ? previewText.substring(0, 30) + '...' : previewText}
                </p>
            </div>

            <div className="absolute right-2.5 top-0 bottom-0 flex flex-col items-end justify-center py-2.5">
                <span className={`text-[10px] mb-1 whitespace-nowrap ${isSelected ? 'text-gray-600 dark:text-gray-400 font-medium' : 'text-gray-400'}`}>
                    {formatTime(lastMsg?.createdAt || chat.updatedAt)}
                </span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={onTogglePin}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 ${isPinned ? 'opacity-100 text-red-400' : 'text-gray-400'}`}
                    >
                        <Pin size={11} fill={isPinned ? 'currentColor' : 'none'} className={isPinned ? "rotate-45" : ""} />
                    </button>
                    {unreadCount > 0 && (
                        <span className="w-4.5 h-4.5 rounded-full bg-teal-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
