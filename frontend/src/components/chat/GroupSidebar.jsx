import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Search, MessageSquarePlus } from "lucide-react";
import Avatar from "../common/Avatar";
import SkeletonLoader from "../common/SkeletonLoader";
import useGroupStore from "../../store/groupStore";
import useUiStore from "../../store/uiStore";
import useAuthStore from "../../store/authStore";

const GroupSidebar = () => {
    const user = useAuthStore((s) => s.user);
    const setMobileChatOpen = useUiStore((s) => s.setMobileChatOpen);
    const setShowProfilePanel = useUiStore((s) => s.setShowProfilePanel);
    const sidebarTab = useUiStore((s) => s.sidebarTab);
    const setSidebarTab = useUiStore((s) => s.setSidebarTab);

    const {
        groups,
        selectedGroup,
        isLoadingGroups,
        fetchMyGroups,
        setSelectedGroup
    } = useGroupStore();

    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    useEffect(() => {
        if (sidebarTab === "group" && user) {
            fetchMyGroups();
        }
    }, [sidebarTab, user, fetchMyGroups]);

    const handleSelectGroup = (group) => {
        setSelectedGroup(group);
        setMobileChatOpen(true);
        setShowProfilePanel(true);
    };

    const handleCreateGroup = () => {
        // We will pop open a CreateGroupModal here
        // For now, toggle a generic UI store state if needed, or emit event
        window.dispatchEvent(new CustomEvent('open-create-group-modal'));
    };

    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) return groups;
        return groups.filter((g) => 
            g.groupName.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [groups, searchQuery]);

    if (sidebarTab === "private") {
        return null;
    }

    return (
        <div className="flex flex-col h-full animate-fade-in" style={{ background: 'var(--panel-bg)' }}>
            {/* Header & Tabs */}
            <div className="flex flex-col px-5 pt-5 pb-3 gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 tracking-tight font-display">Messages</h2>
                    <button
                        onClick={handleCreateGroup}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 hover:text-teal-500 transition-colors" title="Create Group"
                    >
                        <MessageSquarePlus size={15} />
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

            {/* Search Bar */}
            <div className="px-5 pb-2">
                <div className="relative flex items-center bg-gray-50 dark:bg-gray-800/60 rounded-xl px-3.5 py-2 border border-gray-100 dark:border-gray-700/50 focus-within:border-gray-300 dark:focus-within:border-gray-600 transition-all">
                    <Search size={15} className="text-gray-400 shrink-0" />
                    <input
                        type="text"
                        placeholder="Search groups"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                        className="w-full bg-transparent pl-2.5 text-[13px] outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400"
                    />
                </div>
            </div>

            {/* Group Lists Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pt-1 pb-3 space-y-3">
                {isLoadingGroups ? (
                    <div className="px-1">
                        <SkeletonLoader type="chat-list" count={4} />
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        <div className="px-2 flex items-center gap-2 mb-1.5 mt-2">
                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">My Groups</span>
                        </div>
                        
                        {filteredGroups.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                                <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-3">
                                    <MessageSquarePlus size={24} strokeWidth={1.3} className="text-teal-400" />
                                </div>
                                <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 mb-1">No groups yet</p>
                                <p className="text-[12px] text-gray-400">Create one to start chatting</p>
                            </div>
                        ) : (
                            filteredGroups.map(group => (
                                <GroupItem
                                    key={group._id}
                                    group={group}
                                    isSelected={selectedGroup?._id === group._id}
                                    onSelect={() => handleSelectGroup(group)}
                                />
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

/* ----- GroupItem Sub-component ----- */
const GroupItem = ({ group, isSelected, onSelect }) => {
    return (
        <div
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-150 group cursor-pointer border ${isSelected
                ? "bg-teal-50 dark:bg-teal-900/20 border-teal-100 dark:border-teal-800/50"
                : "bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/40"
                }`}
            onClick={onSelect}
        >
            <Avatar
                src={group.groupAvatar}
                name={group.groupName}
                size="md"
                // Groups can use the rounded square style too, handled by Avatar component default
            />
            <div className="flex-1 min-w-0 pr-2">
                <div className="flex justify-between items-center mb-0.5">
                    <h4 className={`font-semibold text-[14px] truncate ${isSelected ? "text-teal-700 dark:text-teal-300" : "text-gray-800 dark:text-gray-200"
                        }`}>
                        {group.groupName}
                    </h4>
                </div>
                <p className="text-[12px] truncate text-gray-400 dark:text-gray-500">
                    {group.description || "No description"}
                </p>
            </div>
        </div>
    );
};

export default GroupSidebar;
