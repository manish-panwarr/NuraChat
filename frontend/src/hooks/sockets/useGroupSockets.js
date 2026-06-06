import { useEffect } from "react";
import socketService from "../../services/socketService";
import useGroupStore from "../../store/groupStore";
import useAuthStore from "../../store/authStore";
import { toast } from "react-hot-toast";

export const useGroupSockets = (user) => {
    useEffect(() => {
        if (!user?._id) return;

        const handleNewGroupMessage = (msg) => {
            const state = useGroupStore.getState();
            const selectedGroup = state.selectedGroup;

            if (selectedGroup && selectedGroup._id === msg.groupId) {
                const isDuplicate = state.groupMessages.some((m) => m._id === msg._id);
                if (!isDuplicate) {
                    const senderIdStr = (msg.senderId && typeof msg.senderId === "object") ? msg.senderId._id : msg.senderId;
                    const matchIndex = state.groupMessages.findIndex((m) => {
                        const isTemp = String(m._id).startsWith("temp-");
                        if (!isTemp) return false;

                        const mSenderIdStr = (m.senderId && typeof m.senderId === "object") ? m.senderId._id : m.senderId;
                        if (String(mSenderIdStr) !== String(senderIdStr)) return false;

                        if (m.encryptedPayload !== msg.encryptedPayload) return false;

                        const timeDiff = Math.abs(new Date(m.createdAt).getTime() - new Date(msg.createdAt).getTime());
                        return timeDiff < 10000;
                    });

                    if (matchIndex !== -1) {
                        const updated = [...state.groupMessages];
                        updated[matchIndex] = { ...msg, senderId: msg.senderId || state.groupMessages[matchIndex].senderId };
                        useGroupStore.setState({ groupMessages: updated });
                    } else {
                        useGroupStore.getState().addGroupMessage(msg);
                    }
                }
            } else {
                toast(`New message in group`, {
                    icon: "",
                    duration: 3000,
                    id: `group-msg-${msg.groupId}`
                });
            }
        };

        const handleMemberAdded = (member) => {
            const groupStore = useGroupStore.getState();
            const authUser = useAuthStore.getState().user;
            const targetGroupId = member.groupId?._id || member.groupId;

            if (targetGroupId) {
                if (groupStore.selectedGroup && groupStore.selectedGroup._id === targetGroupId) {
                    groupStore.fetchGroupMembers(targetGroupId);
                }

                const memberUserId = member.userId?._id || member.userId;
                if (memberUserId === authUser?._id) {
                    groupStore.fetchMyGroups();
                    toast.success("You were added to a new group!");
                } else {
                    groupStore.fetchGroupMembers(targetGroupId);
                }
            }
        };

        const handleMemberRemoved = ({ groupId, memberId, userId }) => {
            const groupStore = useGroupStore.getState();
            const authUser = useAuthStore.getState().user;
            const targetUserId = userId?._id || userId;

            if (targetUserId === authUser?._id) {
                toast.error("You were removed from the group");
                groupStore.fetchMyGroups();
                if (groupStore.selectedGroup?._id === groupId) {
                    groupStore.setSelectedGroup(null);
                }
            } else {
                if (groupStore.selectedGroup?._id === groupId) {
                    groupStore.fetchGroupMembers(groupId);
                }
            }
        };

        const handleAdminGranted = (member) => {
            const groupStore = useGroupStore.getState();
            const authUser = useAuthStore.getState().user;
            const targetGroupId = member.groupId?._id || member.groupId;

            if (targetGroupId) {
                if (groupStore.selectedGroup && groupStore.selectedGroup._id === targetGroupId) {
                    groupStore.fetchGroupMembers(targetGroupId);
                }

                const memberUserId = member.userId?._id || member.userId;
                if (memberUserId === authUser?._id) {
                    toast.success("You are now a group administrator!");
                    groupStore.fetchMyGroups();
                }
            }
        };

        const handleAdminRevoked = (member) => {
            const groupStore = useGroupStore.getState();
            const authUser = useAuthStore.getState().user;
            const targetGroupId = member.groupId?._id || member.groupId;

            if (targetGroupId) {
                if (groupStore.selectedGroup && groupStore.selectedGroup._id === targetGroupId) {
                    groupStore.fetchGroupMembers(targetGroupId);
                }

                const memberUserId = member.userId?._id || member.userId;
                if (memberUserId === authUser?._id) {
                    toast.error("Your administrator privileges were revoked.");
                    groupStore.fetchMyGroups();
                }
            }
        };

        const handleGroupUpdated = (updatedGroup) => {
            const groupStore = useGroupStore.getState();
            const updatedList = groupStore.groups.map(g => g._id === updatedGroup._id ? updatedGroup : g);
            useGroupStore.setState({
                groups: updatedList,
                selectedGroup: groupStore.selectedGroup?._id === updatedGroup._id ? updatedGroup : groupStore.selectedGroup
            });
        };

        socketService.on("new-group-message", handleNewGroupMessage);
        socketService.on("memberAdded", handleMemberAdded);
        socketService.on("memberRemoved", handleMemberRemoved);
        socketService.on("adminGranted", handleAdminGranted);
        socketService.on("adminRevoked", handleAdminRevoked);
        socketService.on("groupUpdated", handleGroupUpdated);

        return () => {
            socketService.off("new-group-message", handleNewGroupMessage);
            socketService.off("memberAdded", handleMemberAdded);
            socketService.off("memberRemoved", handleMemberRemoved);
            socketService.off("adminGranted", handleAdminGranted);
            socketService.off("adminRevoked", handleAdminRevoked);
            socketService.off("groupUpdated", handleGroupUpdated);
        };
    }, [user?._id]);
};
