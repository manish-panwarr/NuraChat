import React, { useState, useEffect } from "react";
import { X, Users, Check, Search, ImagePlus } from "lucide-react";
import Avatar from "../common/Avatar";
import useAuthStore from "../../store/authStore";
import useGroupStore from "../../store/groupStore";
import { searchUsers } from "../../services/chatService";
import { toast } from "react-hot-toast";

const CreateGroupModal = ({ isOpen, onClose }) => {
    const user = useAuthStore((s) => s.user);
    const fetchMyGroups = useGroupStore((s) => s.fetchMyGroups);
    const [groupName, setGroupName] = useState("");
    const [description, setDescription] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setGroupName("");
            setDescription("");
            setSearchQuery("");
            setSearchResults([]);
            setSelectedMembers([]);
        }
    }, [isOpen]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            try {
                const results = await searchUsers(searchQuery);
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
        return () => clearTimeout(timer);
    }, [searchQuery, user?._id]);

    const handleToggleMember = (targetUser) => {
        setSelectedMembers(prev => {
            const exists = prev.find(p => p._id === targetUser._id);
            if (exists) return prev.filter(p => p._id !== targetUser._id);
            return [...prev, targetUser];
        });
    };

    const handleCreate = async () => {
        if (!groupName.trim()) {
            toast.error("Group name is required");
            return;
        }

        setIsCreating(true);
        try {
            // First create the group
            const groupService = (await import("../../services/groupService")).default;
            const newGroup = await groupService.createGroup({
                groupName,
                description
            });

            // Then invite selected members sequentially (or Promise.all)
            if (selectedMembers.length > 0) {
                const invitePromises = selectedMembers.map(member => 
                    groupService.addGroupMember(newGroup._id, member._id, "member")
                );
                await Promise.allSettled(invitePromises);
                toast.success(`Group created and ${selectedMembers.length} invitations sent!`);
            } else {
                toast.success("Group created!");
            }

            await fetchMyGroups();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create group");
        } finally {
            setIsCreating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in text-left">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden animate-scale-in border border-gray-100 dark:border-gray-800">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                            <Users size={20} />
                        </div>
                        <h2 className="text-[16px] font-bold text-gray-800 dark:text-gray-100 font-display tracking-tight">
                            Create New Group
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
                    
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[12px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Group Name</label>
                            <input
                                type="text"
                                placeholder="E.g., Weekend Getaway"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-[14px] text-gray-800 dark:text-gray-100 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-[12px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Description (Optional)</label>
                            <input
                                type="text"
                                placeholder="What's this group about?"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-[13px] text-gray-800 dark:text-gray-100 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                            />
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 dark:bg-gray-800 w-full" />

                    {/* Member Selection */}
                    <div>
                        <label className="flex justify-between items-center mb-1.5">
                            <span className="text-[12px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Add Members</span>
                            <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400">{selectedMembers.length} selected</span>
                        </label>
                        
                        <div className="relative mb-3">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search users by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2 text-[13px] text-gray-800 dark:text-gray-100 focus:outline-none focus:border-teal-500 transition-all"
                            />
                            {isSearching && (
                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-gray-300 border-t-teal-500 rounded-full animate-spin" />
                            )}
                        </div>

                        {/* Selected Members Mini-List */}
                        {selectedMembers.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {selectedMembers.map(m => (
                                    <div key={m._id} className="flex items-center gap-1.5 bg-teal-50 dark:bg-teal-900/30 border border-teal-100 dark:border-teal-800 pl-1 pr-2 py-1 rounded-full animate-scale-in">
                                        <Avatar src={m.profileImage} name={m.firstName} size="xs" />
                                        <span className="text-[11px] font-medium text-teal-700 dark:text-teal-300">{m.firstName}</span>
                                        <button onClick={() => handleToggleMember(m)} className="text-teal-600/70 hover:text-teal-600 dark:text-teal-400/70 dark:hover:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-800 rounded-full p-0.5 transition-colors">
                                            <X size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Search Results */}
                        <div className="max-h-48 overflow-y-auto custom-scrollbar border border-gray-100 dark:border-gray-800 rounded-xl">
                            {searchQuery && searchResults.length === 0 && !isSearching ? (
                                <div className="p-6 text-center text-[13px] text-gray-400">No users found</div>
                            ) : searchResults.map(u => {
                                const isSelected = selectedMembers.some(sm => sm._id === u._id);
                                return (
                                    <div 
                                        key={u._id}
                                        onClick={() => handleToggleMember(u)}
                                        className="flex items-center justify-between p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-50 dark:border-gray-800/50 last:border-0 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar src={u.profileImage} name={`${u.firstName} ${u.lastName}`} size="sm" />
                                            <div>
                                                <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 leading-none">{u.firstName} {u.lastName}</p>
                                                <p className="text-[11px] text-gray-500 mt-1">{u.email}</p>
                                            </div>
                                        </div>
                                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-teal-500 border-teal-500 text-white' : 'border-gray-300 dark:border-gray-600 text-transparent group-hover:border-teal-500'}`}>
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-2 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-[13px] font-medium text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={isCreating || !groupName.trim()}
                        className="px-6 py-2.5 text-[13px] font-semibold text-white bg-teal-500 hover:bg-teal-600 disabled:opacity-50 disabled:hover:bg-teal-500 rounded-xl shadow-sm transition-all flex items-center gap-2"
                    >
                        {isCreating ? "Creating..." : "Create Group"}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CreateGroupModal;
