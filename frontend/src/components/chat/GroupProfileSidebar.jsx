import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Users, LogOut, Settings, Plus, RotateCcw, Camera, Save, Loader2, Search, Trash2, Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import Avatar from "../common/Avatar";
import useUiStore from "../../store/uiStore";
import useGroupStore from "../../store/groupStore";
import useAuthStore from "../../store/authStore";
import groupService from "../../services/groupService";
import { searchUsers } from "../../services/chatService";
import { toast } from "react-hot-toast";

const GroupProfileSidebar = () => {
    const user = useAuthStore((s) => s.user);
    const selectedGroup = useGroupStore((s) => s.selectedGroup);
    const groupMembers = useGroupStore((s) => s.groupMembers);
    const fetchGroupMembers = useGroupStore((s) => s.fetchGroupMembers);
    const removeGroupMember = useGroupStore((s) => s.removeGroupMember);
    const addGroupMember = useGroupStore((s) => s.addGroupMember);
    const updateMemberRole = useGroupStore((s) => s.updateMemberRole);
    const updateGroup = useGroupStore((s) => s.updateGroup);
    const uploadGroupAvatar = useGroupStore((s) => s.uploadGroupAvatar);
    const fetchMyGroups = useGroupStore((s) => s.fetchMyGroups);
    const setSelectedGroup = useGroupStore((s) => s.setSelectedGroup);

    const showProfilePanel = useUiStore((s) => s.showProfilePanel);
    const setShowProfilePanel = useUiStore((s) => s.setShowProfilePanel);
    const sidebarTab = useUiStore((s) => s.sidebarTab);

    // Group editing states
    const [isEditingDetails, setIsEditingDetails] = useState(false);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState("");
    const [isSavingDetails, setIsSavingDetails] = useState(false);
    const fileInputRef = useRef(null);

    // Add Member states
    const [showAddMember, setShowAddMember] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        if (selectedGroup?._id && showProfilePanel && sidebarTab === "group") {
            fetchGroupMembers(selectedGroup._id);
        }
    }, [selectedGroup?._id, showProfilePanel, sidebarTab, fetchGroupMembers]);

    useEffect(() => {
        if (selectedGroup) {
            setEditName(selectedGroup.groupName || "");
            setEditDescription(selectedGroup.description || "");
            setAvatarPreview(selectedGroup.groupAvatar || "");
            setAvatarFile(null);
        }
    }, [isEditingDetails, selectedGroup]);

    if (!showProfilePanel || !selectedGroup || sidebarTab !== "group") return null;

    const myMemberObj = groupMembers.find(m => m.userId?._id === user?._id);
    const myRole = myMemberObj?.role;
    const canManage = myRole === "creator" || myRole === "admin";

    const handleLeaveGroup = async () => {
        if (!window.confirm(`Are you sure you want to leave ${selectedGroup.groupName}?`)) return;

        setIsLeaving(true);
        try {
            await groupService.removeGroupMember(myMemberObj?._id);
            toast.success("You left the group");
            setShowProfilePanel(false);
            setSelectedGroup(null);
            fetchMyGroups();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to leave group");
        } finally {
            setIsLeaving(false);
        }
    };

    // Handle Remove Member
    const handleRemoveMember = async (memberId, memberName) => {
        if (!window.confirm(`Remove ${memberName} from the group?`)) return;
        try {
            await removeGroupMember(selectedGroup._id, memberId);
            toast.success("Member removed");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to remove member");
        }
    };

    // Handle Role Update (Promote/Demote)
    const handleToggleRole = async (memberId, currentRole, memberName) => {
        const newRole = currentRole === "admin" ? "member" : "admin";
        const promptMsg = newRole === "admin"
            ? `Promote ${memberName} to administrator?`
            : `Revoke administrator privileges from ${memberName}?`;

        if (!window.confirm(promptMsg)) return;

        try {
            await updateMemberRole(memberId, newRole);
            toast.success(`Role updated successfully`);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update role");
        }
    };

    // Handle Avatar change
    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    // Save Group Details Changes
    const handleSaveGroupDetails = async () => {
        if (!editName.trim()) {
            toast.error("Group Name is required");
            return;
        }

        setIsSavingDetails(true);
        try {
            let updated = null;
            if (avatarFile) {
                const uploadRes = await uploadGroupAvatar(selectedGroup._id, avatarFile);
                updated = uploadRes;
            }

            const detailsRes = await updateGroup(selectedGroup._id, {
                groupName: editName.trim(),
                description: editDescription.trim()
            });
            updated = detailsRes;

            toast.success("Group details updated");
            setIsEditingDetails(false);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update group settings");
        } finally {
            setIsSavingDetails(false);
        }
    };

    // Add Member Search
    const handleSearchUsers = async (query) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const results = await searchUsers(query);
            // Filter out users already in the group
            const filtered = results.filter(u =>
                !groupMembers.some(m => m.userId?._id === u._id)
            );
            setSearchResults(filtered);
        } catch {
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddMemberToGroup = async (targetUserId, targetUserName) => {
        try {
            await addGroupMember(selectedGroup._id, targetUserId);
            toast.success(`${targetUserName} added to the group`);
            setSearchResults(prev => prev.filter(u => u._id !== targetUserId));
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to add member");
        }
    };

    return (
        <div className="flex flex-col h-full animate-fade-in" style={{ background: 'var(--panel-bg)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 tracking-tight font-display">
                    {isEditingDetails ? "Edit Group" : showAddMember ? "Add Members" : "Group Info"}
                </h2>
                <button
                    onClick={() => {
                        if (isEditingDetails) setIsEditingDetails(false);
                        else if (showAddMember) setShowAddMember(false);
                        else setShowProfilePanel(false);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer border-none"
                >
                    <X size={14} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-5">
                {/* Edit Details Mode */}
                {isEditingDetails ? (
                    <div className="space-y-4 mt-2">
                        {/* Edit Avatar */}
                        <div className="flex flex-col items-center mb-6">
                            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                                <Avatar src={avatarPreview} name={editName} size="xll" />
                                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera size={20} className="text-white" />
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleAvatarChange}
                                    accept="image/*"
                                    className="hidden"
                                />
                            </div>
                            <span className="text-[11px] text-gray-400 mt-2 font-medium">Click to upload avatar image</span>
                        </div>

                        {/* Name Input */}
                        <div>
                            <label className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold block mb-1">
                                Group Name
                            </label>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[13px] text-gray-700 dark:text-gray-200 outline-none focus:border-teal-500 transition-colors"
                            />
                        </div>

                        {/* Bio Input */}
                        <div>
                            <label className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold block mb-1">
                                Bio / Description
                            </label>
                            <textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[13px] text-gray-700 dark:text-gray-200 outline-none focus:border-teal-500 transition-colors custom-scrollbar"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-3">
                            <button
                                onClick={() => setIsEditingDetails(false)}
                                className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold text-[13px] hover:bg-gray-200 transition-colors border-none cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveGroupDetails}
                                disabled={isSavingDetails}
                                className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-semibold text-[13px] transition-colors shadow-sm disabled:opacity-50 border-none cursor-pointer flex items-center justify-center gap-1.5"
                            >
                                {isSavingDetails ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                <span>Save Changes</span>
                            </button>
                        </div>
                    </div>
                ) : showAddMember ? (
                    /*  Add Member Mode */
                    <div className="space-y-4 mt-2">
                        {/* Search Input */}
                        <div className="relative flex items-center bg-gray-50 dark:bg-gray-800/60 rounded-xl px-3.5 py-2.5 border border-gray-100 dark:border-gray-700/50 focus-within:border-gray-300 dark:focus-within:border-gray-600 transition-all">
                            <Search size={15} className="text-gray-400 shrink-0" />
                            <input
                                type="text"
                                placeholder="Search users by name or email"
                                value={searchQuery}
                                onChange={(e) => handleSearchUsers(e.target.value)}
                                className="w-full bg-transparent pl-2.5 text-[13px] outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400"
                            />
                            {isSearching && (
                                <Loader2 size={14} className="animate-spin text-teal-500 shrink-0" />
                            )}
                        </div>

                        {/* Search Results */}
                        <div className="space-y-1 mt-3">
                            {searchResults.length > 0 ? (
                                searchResults.map(u => (
                                    <div key={u._id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <Avatar src={u.profileImage} name={`${u.firstName} ${u.lastName || ""}`} size="sm" />
                                            <div className="min-w-0">
                                                <p className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                    {u.firstName} {u.lastName}
                                                </p>
                                                <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleAddMemberToGroup(u._id, u.firstName)}
                                            className="px-2.5 py-1 text-[11px] font-bold text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors border-none cursor-pointer"
                                        >
                                            Add
                                        </button>
                                    </div>
                                ))
                            ) : searchQuery && !isSearching ? (
                                <p className="text-center text-[12px] text-gray-400 py-6">No users found to add.</p>
                            ) : (
                                <p className="text-center text-[11px] text-gray-400 py-6">Type a name to search and invite members.</p>
                            )}
                        </div>
                    </div>
                ) : (

                    <>
                        {/* Profile Info */}
                        <div className="flex flex-col items-center pb-5 border-b border-gray-100 dark:border-gray-800/50 mb-4 mt-2">
                            <Avatar
                                src={selectedGroup.groupAvatar}
                                name={selectedGroup.groupName}
                                size="xl"
                            />
                            <h3 className="mt-3 text-[16px] font-semibold text-gray-800 dark:text-gray-100 font-display text-center">
                                {selectedGroup.groupName}
                            </h3>
                            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 max-w-[220px] text-center">
                                {selectedGroup.description || "No description provided."}
                            </p>
                        </div>

                        {/* Actions buttons */}
                        <div className="flex gap-2 w-full pb-4 mb-4 border-b border-gray-100 dark:border-gray-800/50 justify-center">
                            {canManage && (
                                <button
                                    onClick={() => setShowAddMember(true)}
                                    className="flex-1 flex flex-col justify-center items-center gap-1.5 p-2 rounded-xl text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/10 transition-colors border-none bg-transparent cursor-pointer"
                                    title="Add Member"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-teal-100/70 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                                        <Plus size={16} />
                                    </div>
                                    <span>Add Member</span>
                                </button>
                            )}
                            {canManage && (
                                <button
                                    onClick={() => setIsEditingDetails(true)}
                                    className="flex-1 flex flex-col justify-center items-center gap-1.5 p-2 rounded-xl text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors border-none bg-transparent cursor-pointer"
                                    title="Edit Details"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-purple-100/70 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                                        <Settings size={16} />
                                    </div>
                                    <span>Edit Group</span>
                                </button>
                            )}
                            <button
                                onClick={handleLeaveGroup}
                                disabled={isLeaving || myRole === "creator"}
                                className="flex-1 flex flex-col justify-center items-center gap-1.5 p-2 rounded-xl text-[11px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 disabled:opacity-30 transition-colors border-none bg-transparent cursor-pointer"
                                title={myRole === "creator" ? "Creator cannot leave" : "Leave Group"}
                            >
                                <div className="w-9 h-9 rounded-lg bg-red-100/70 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                                    <LogOut size={16} />
                                </div>
                                <span>Leave Group</span>
                            </button>
                        </div>

                        {/* Members list */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Users size={15} className="text-gray-400" />
                                <h4 className="text-[12.5px] font-bold text-gray-800 dark:text-gray-200">
                                    Group Members ({groupMembers.length})
                                </h4>
                            </div>

                            <div className="space-y-1">
                                {groupMembers.map(member => {
                                    const memberUser = member.userId || {};
                                    const isMe = memberUser._id === user?._id;
                                    const isTargetAdmin = member.role === "creator" || member.role === "admin";

                                    return (
                                        <div key={member._id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <Avatar src={memberUser.profileImage} name={memberUser.firstName} size="sm" isOnline={memberUser.isOnline} />
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1">
                                                        <p className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-200 leading-tight truncate">
                                                            {isMe ? "You" : `${memberUser.firstName || ''} ${memberUser.lastName || ''}`}
                                                        </p>
                                                        {isTargetAdmin && (
                                                            <Shield size={11} className={member.role === "creator" ? "text-amber-500" : "text-teal-500"} title={member.role === "creator" ? "Group Owner" : "Group Admin"} />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <span className="text-[9.5px] font-semibold text-slate-400 capitalize bg-slate-100 dark:bg-gray-800 px-1.5 py-0.2 rounded-full border border-gray-200/50 dark:border-gray-700/50">
                                                            {member.role === "creator" ? "owner" : member.role}
                                                        </span>
                                                        {member.status === "pending" && (
                                                            <>
                                                                <span className="text-[10px] text-slate-300">•</span>
                                                                <span className="text-[9.5px] text-amber-500 italic">invited</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Admin permissions options */}
                                            {canManage && !isMe && member.role !== "creator" && (
                                                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {/* Promote / Demote admin: only creator can manage other admins roles, admins can promote members */}
                                                    {(myRole === "creator" || (myRole === "admin" && member.role !== "admin")) && (
                                                        <button
                                                            onClick={() => handleToggleRole(member._id, member.role, memberUser.firstName)}
                                                            className={`w-7 h-7 flex items-center justify-center rounded-lg border-none cursor-pointer transition-colors ${member.role === "admin"
                                                                    ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100"
                                                                    : "bg-teal-50 dark:bg-teal-900/20 text-teal-600 hover:bg-teal-100"
                                                                }`}
                                                            title={member.role === "admin" ? "Demote to Member" : "Promote to Admin"}
                                                        >
                                                            {member.role === "admin" ? <ShieldAlert size={13} /> : <ShieldCheck size={13} />}
                                                        </button>
                                                    )}

                                                    {/* Remove member: admins cannot remove other admins, only creator can */}
                                                    {(myRole === "creator" || (myRole === "admin" && member.role !== "admin")) && (
                                                        <button
                                                            onClick={() => handleRemoveMember(member._id, memberUser.firstName)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/20 text-red-500 hover:bg-red-100 transition-colors border-none cursor-pointer"
                                                            title="Remove member"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default GroupProfileSidebar;
