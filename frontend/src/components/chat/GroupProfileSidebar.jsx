import React, { useState, useEffect } from "react";
import { X, Users, LogOut, Settings, Plus, RotateCcw } from "lucide-react";
import Avatar from "../common/Avatar";
import useUiStore from "../../store/uiStore";
import useGroupStore from "../../store/groupStore";
import useAuthStore from "../../store/authStore";
import groupService from "../../services/groupService";
import { toast } from "react-hot-toast";

const GroupProfileSidebar = () => {
    const user = useAuthStore((s) => s.user);
    const selectedGroup = useGroupStore((s) => s.selectedGroup);
    const groupMembers = useGroupStore((s) => s.groupMembers);
    const fetchGroupMembers = useGroupStore((s) => s.fetchGroupMembers);
    const removeGroupMember = useGroupStore((s) => s.removeGroupMember);
    const fetchMyGroups = useGroupStore((s) => s.fetchMyGroups);
    const setSelectedGroup = useGroupStore((s) => s.setSelectedGroup);

    const showProfilePanel = useUiStore((s) => s.showProfilePanel);
    const setShowProfilePanel = useUiStore((s) => s.setShowProfilePanel);
    const sidebarTab = useUiStore((s) => s.sidebarTab);

    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        if (selectedGroup?._id && showProfilePanel && sidebarTab === "group") {
            fetchGroupMembers(selectedGroup._id);
        }
    }, [selectedGroup?._id, showProfilePanel, sidebarTab, fetchGroupMembers]);

    if (!showProfilePanel || !selectedGroup || sidebarTab !== "group") return null;

    const myRole = groupMembers.find(m => m.userId?._id === user?._id)?.role;
    const canManage = myRole === "creator" || myRole === "admin";

    const handleLeaveGroup = async () => {
        if (!window.confirm(`Are you sure you want to leave ${selectedGroup.groupName}?`)) return;

        setIsLeaving(true);
        try {
            await groupService.removeGroupMember(selectedGroup._id, user._id);
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

    const handleRemoveMember = async (memberId) => {
        if (!window.confirm("Remove this user from the group?")) return;
        try {
            await removeGroupMember(selectedGroup._id, memberId);
            toast.success("Member removed");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to remove member");
        }
    };

    return (
        <div className="flex flex-col h-full" style={{ background: 'var(--panel-bg)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 tracking-tight font-display">Group Info</h2>
                <button
                    onClick={() => setShowProfilePanel(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                    <X size={14} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-5">
                {/* Profile Section */}
                <div className="flex flex-col items-center pb-5 border-b border-gray-100 dark:border-gray-800/50 mb-4 mt-2">
                    <Avatar
                        src={selectedGroup.groupAvatar}
                        name={selectedGroup.groupName}
                        size="xl"
                    />
                    <h3 className="mt-3 text-[16px] font-sm text-gray-800 dark:text-gray-100 font-display text-center">
                        {selectedGroup.groupName}
                    </h3>
                    <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 max-w-[200px] text-center">
                        {selectedGroup.description || "No description provided."}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex  w-full align-center justify-center mb-5 border-b border-gray-100 dark:border-gray-800/50">
                    {canManage && (
                        <button className="flex justify-center items-center gap-3 w-full p-2.5 rounded-xl text-[13px] font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors">
                            <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center shrink-0">
                                <Plus size={20} />
                            </div>
                            {/* <span>Add Members</span> */}
                        </button>
                    )}
                    {myRole === "creator" && (
                        <button className="flex justify-center items-center gap-3 w-full p-2.5 rounded-xl text-[13px] font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
                                <Settings size={20} />
                            </div>
                            {/* <span>Group Settings</span> */}
                        </button>
                    )}
                    <button
                        onClick={handleLeaveGroup}
                        disabled={isLeaving || myRole === "creator"} // Creator should delete or transfer instead of simply leaving typically
                        className="flex justify-center items-center gap-3 w-full p-2.5 rounded-xl text-[13px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                        title={myRole === "creator" ? "Creator cannot leave. Delete the group instead." : "Leave Group"}
                    >
                        <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                            <LogOut size={20} />
                        </div>
                        {/* <span>Leave Group</span> */}
                    </button>
                </div>

                {/* Members List */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Users size={16} className="text-gray-400" />
                        <h4 className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">
                            Members ({groupMembers.length})
                        </h4>
                    </div>

                    <div className="space-y-1">
                        {groupMembers.map(member => {
                            const memberUser = member.userId || {}; // fallback for safety
                            const isMe = memberUser._id === user?._id;
                            return (
                                <div key={member._id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <Avatar src={memberUser.profileImage} name={memberUser.firstName} size="sm" isOnline={memberUser.isOnline} />
                                        <div>
                                            <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                                                {isMe ? "You" : `${memberUser.firstName || ''} ${memberUser.lastName || ''}`}
                                            </p>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <span className="text-[10px] text-slate-500 capitalize">{member.role}</span>
                                                {member.status === "pending" && (
                                                    <>
                                                        <span className="text-[10px] text-slate-300">•</span>
                                                        <span className="text-[10px] text-amber-500 italic">Pending Invite</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {canManage && !isMe && member.role !== "creator" && (
                                        <button
                                            onClick={() => handleRemoveMember(memberUser._id)}
                                            className="w-7 h-7 flex items-center justify-center rounded bg-red-50 dark:bg-red-900/20 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-100"
                                            title="Remove member"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default GroupProfileSidebar;
