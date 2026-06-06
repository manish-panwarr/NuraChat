import { useEffect } from "react";
import socketService from "../../services/socketService";
import useCallStore, { CALL_STATUS, isCallActiveStatus } from "../../store/callStore";
import useGroupStore from "../../store/groupStore";
import { ringtoneManager } from "../../utils/ringtoneManager";
import { toast } from "react-hot-toast";
import { getLiveKitToken } from "../../services/livekitService";

export const useCallSockets = (user, navigate) => {
    useEffect(() => {
        if (!user?._id) return;

        const { setCallState, resetCallState } = useCallStore.getState();

        const handleIncomingCall = ({ from, roomName, type, callerName, isGroup, groupId, groupName }) => {
            const currentCallState = useCallStore.getState().callState;
            if (isCallActiveStatus(currentCallState.status)) {
                if (!isGroup) {
                    socketService.emit("livekit-user-busy", { to: from });
                }
                return;
            }

            console.log("[GlobalSocketManager] Incoming call from:", from, "room:", roomName, "type:", type, "isGroup:", isGroup);

            setCallState({
                status: CALL_STATUS.INCOMING_CALL,
                role: isGroup ? "group" : "receiver",
                roomName,
                type,
                peerId: isGroup ? groupId : from,
                peerName: isGroup ? groupName : callerName,
                isGroup: !!isGroup,
            });

            ringtoneManager.startIncoming();
        };

        const handleCallAccepted = ({ roomName, startTime }) => {
            const currentCallState = useCallStore.getState().callState;
            console.log("[GlobalSocketManager] livekit-call-accepted. currentStatus:", currentCallState.status, "startTime:", startTime);

            if (
                currentCallState.status !== CALL_STATUS.OUTGOING_CALL &&
                currentCallState.status !== CALL_STATUS.RINGING &&
                currentCallState.status !== CALL_STATUS.ACCEPTED &&
                currentCallState.status !== CALL_STATUS.CONNECTING
            ) {
                console.log("[GlobalSocketManager] Ignoring livekit-call-accepted: unexpected status", currentCallState.status);
                return;
            }

            ringtoneManager.stopOutgoing();
            setCallState({ status: CALL_STATUS.ACCEPTED, startTime });

            const { roomName: rn, type, peerId, peerName, isGroup } = useCallStore.getState().callState;
            const targetRoom = roomName || rn;
            console.log("[GlobalSocketManager] Navigating caller to call page. room:", targetRoom);
            navigate(
                `/call?room=${targetRoom}&type=${type}&recipientName=${encodeURIComponent(peerName || "User")}&recipientId=${peerId}${isGroup ? "&isGroup=true" : ""}`
            );
        };

        const handleCallJoinReady = ({ roomName, startTime }) => {
            const currentCallState = useCallStore.getState().callState;
            console.log("[GlobalSocketManager] livekit-call-join-ready. currentStatus:", currentCallState.status, "startTime:", startTime);

            if (
                currentCallState.status !== CALL_STATUS.ACCEPTED &&
                currentCallState.status !== CALL_STATUS.CONNECTING &&
                currentCallState.status !== CALL_STATUS.INCOMING_CALL
            ) {
                console.log("[GlobalSocketManager] Ignoring livekit-call-join-ready: unexpected status", currentCallState.status);
                return;
            }

            if (currentCallState.roomName && roomName && currentCallState.roomName !== roomName) {
                console.log("[GlobalSocketManager] livekit-call-join-ready: roomName mismatch, ignoring.");
                return;
            }

            setCallState({ status: CALL_STATUS.CONNECTING, startTime });
            console.log("[GlobalSocketManager] Receiver status updated to CONNECTING. startTime:", startTime);
        };

        const handleActiveGroupCallsList = (callsList) => {
            useGroupStore.getState().setActiveGroupCallsList(callsList);
        };

        const handleCallChatMessage = (msg) => {
            const state = useCallStore.getState();
            if (msg.id && state.callChatMessages.some((m) => m.id === msg.id)) {
                useCallStore.getState().addCallChatMessage({
                    id: msg.id,
                    status: "sent"
                });
                return;
            }
            useCallStore.getState().addCallChatMessage({
                ...msg,
                status: "sent"
            });
        };

        const handleCallChatMessageAck = ({ id }) => {
            if (window._callChatAcks && window._callChatAcks.has(id)) {
                clearTimeout(window._callChatAcks.get(id));
                window._callChatAcks.delete(id);
            }
            useCallStore.getState().addCallChatMessage({
                id,
                status: "sent"
            });
        };

        const handleGroupCallStatusUpdate = ({ groupId, active, roomName, type, participantsCount }) => {
            useGroupStore.getState().setActiveGroupCall(groupId, { active, roomName, type, participantsCount });
        };

        const handleGroupCallJoined = ({ startTime }) => {
            const currentCallState = useCallStore.getState().callState;
            if (currentCallState.status === CALL_STATUS.CONNECTED || currentCallState.status === CALL_STATUS.RECONNECTING) {
                setCallState({ startTime: currentCallState.startTime || startTime });
                return;
            }
            setCallState({ status: CALL_STATUS.ACCEPTED, startTime });
        };

        const handleCallDeclined = ({ from }) => {
            const currentCallState = useCallStore.getState().callState;
            console.log("[GlobalSocketManager] livekit-call-declined. from:", from, "currentStatus:", currentCallState.status);
            if (currentCallState.status === CALL_STATUS.IDLE) return;

            const peerName = currentCallState.peerName || "User";
            ringtoneManager.stopAll();
            resetCallState();
            toast.error(`${peerName} declined the call`);
            navigate("/");
        };

        const handleCallEnded = ({ from, reason }) => {
            const currentCallState = useCallStore.getState().callState;
            console.log("[GlobalSocketManager] livekit-call-ended. from:", from, "reason:", reason, "currentStatus:", currentCallState.status);
            if (currentCallState.status === CALL_STATUS.IDLE) return;

            ringtoneManager.stopAll();
            resetCallState();

            const message = reason === "disconnect" ? "Peer disconnected" : "Call ended";
            toast(message, { icon: "" });
            navigate("/");
        };

        const handleUserBusy = () => {
            const currentCallState = useCallStore.getState().callState;
            if (currentCallState.status === CALL_STATUS.IDLE) return;
            ringtoneManager.stopAll();
            resetCallState();
            toast.error("User is currently on another call.");
            navigate("/");
        };

        const handleCallTimeout = () => {
            const currentCallState = useCallStore.getState().callState;
            if (currentCallState.status === CALL_STATUS.IDLE) return;
            ringtoneManager.stopAll();
            resetCallState();
            toast.error("No answer. Try again later.");
            navigate("/");
        };

        const handleCallRequestBusy = ({ callerName, type }) => {
            toast(`Missed ${type} call from ${callerName} (currently busy)`, {
                icon: "",
                duration: 5000,
            });
        };

        const handleCallSync = async (syncData) => {
            const { callState: currentCallState, activeRoom, initCallRoom } = useCallStore.getState();
            console.log("[GlobalSocketManager] livekit-call-sync received:", syncData, "localStatus:", currentCallState.status);

            if (!syncData) {
                if (currentCallState.status !== CALL_STATUS.IDLE) {
                    console.log("[GlobalSocketManager] Sync: backend idle, local active — resetting local state.");
                    ringtoneManager.stopAll();
                    resetCallState();
                    toast.error("Call disconnected");
                    navigate("/");
                }
                return;
            }

            if (currentCallState.status === CALL_STATUS.IDLE) {
                console.log("[GlobalSocketManager] Sync: backend active, local idle — restoring state:", syncData);
                setCallState({
                    status: syncData.status,
                    roomName: syncData.roomName,
                    type: syncData.type,
                    peerId: syncData.peerId,
                    peerName: syncData.peerName || "User",
                    isGroup: syncData.isGroup,
                    startTime: syncData.startTime,
                    role: syncData.role,
                });

                if (syncData.status === CALL_STATUS.INCOMING_CALL) {
                    ringtoneManager.startIncoming();
                } else if (syncData.status === CALL_STATUS.OUTGOING_CALL || syncData.status === CALL_STATUS.RINGING) {
                    ringtoneManager.startOutgoing();
                } else if (
                    [CALL_STATUS.ACCEPTED, CALL_STATUS.CONNECTING, CALL_STATUS.CONNECTED, CALL_STATUS.RECONNECTING].includes(syncData.status) &&
                    !activeRoom
                ) {
                    try {
                        const livekitUrl = import.meta.env.VITE_LIVEKIT_URL;
                        const data = await getLiveKitToken(syncData.roomName);
                        await initCallRoom(
                            syncData.roomName,
                            data.token,
                            livekitUrl,
                            syncData.type,
                            syncData.peerId,
                            syncData.peerName || "User",
                            syncData.isGroup,
                            syncData.startTime
                        );
                        console.log("[GlobalSocketManager] Sync: LiveKit room restored successfully.");
                        navigate(
                            `/call?room=${syncData.roomName}&type=${syncData.type}&recipientName=${encodeURIComponent(syncData.peerName || "User")}&recipientId=${syncData.peerId}&incoming=true${syncData.isGroup ? "&isGroup=true" : ""}`
                        );
                    } catch (err) {
                        console.error("[GlobalSocketManager] Sync: Failed to restore LiveKit connection:", err);
                        resetCallState();
                        navigate("/");
                    }
                }
            } else {
                if (syncData.startTime && !currentCallState.startTime) {
                    setCallState({ startTime: syncData.startTime });
                }

                const needsReconnect =
                    [CALL_STATUS.ACCEPTED, CALL_STATUS.CONNECTING, CALL_STATUS.CONNECTED, CALL_STATUS.RECONNECTING].includes(currentCallState.status) &&
                    !activeRoom;

                if (needsReconnect) {
                    try {
                        const livekitUrl = import.meta.env.VITE_LIVEKIT_URL;
                        const roomNameToUse = currentCallState.roomName || syncData.roomName;
                        const data = await getLiveKitToken(roomNameToUse);
                        await initCallRoom(
                            roomNameToUse,
                            data.token,
                            livekitUrl,
                            currentCallState.type || syncData.type,
                            currentCallState.peerId || syncData.peerId,
                            currentCallState.peerName || syncData.peerName || "User",
                            currentCallState.isGroup || syncData.isGroup,
                            currentCallState.startTime || syncData.startTime
                        );
                        console.log("[GlobalSocketManager] Sync: Re-established LiveKit connection.");
                    } catch (err) {
                        console.error("[GlobalSocketManager] Sync: Failed to re-establish LiveKit connection:", err);
                        resetCallState();
                        navigate("/");
                    }
                }
            }
        };

        socketService.on("livekit-incoming-call", handleIncomingCall);
        socketService.on("livekit-call-accepted", handleCallAccepted);
        socketService.on("livekit-call-join-ready", handleCallJoinReady);
        socketService.on("livekit-call-declined", handleCallDeclined);
        socketService.on("livekit-call-ended", handleCallEnded);
        socketService.on("livekit-user-busy", handleUserBusy);
        socketService.on("livekit-call-timeout", handleCallTimeout);
        socketService.on("livekit-call-request-busy", handleCallRequestBusy);
        socketService.on("livekit-call-sync", handleCallSync);
        socketService.on("active-group-calls-list", handleActiveGroupCallsList);
        socketService.on("group-call-status-update", handleGroupCallStatusUpdate);
        socketService.on("livekit-group-call-joined", handleGroupCallJoined);
        socketService.on("livekit-call-chat-message", handleCallChatMessage);
        socketService.on("livekit-call-chat-message-ack", handleCallChatMessageAck);

        return () => {
            socketService.off("livekit-incoming-call", handleIncomingCall);
            socketService.off("livekit-call-accepted", handleCallAccepted);
            socketService.off("livekit-call-join-ready", handleCallJoinReady);
            socketService.off("livekit-call-declined", handleCallDeclined);
            socketService.off("livekit-call-ended", handleCallEnded);
            socketService.off("livekit-user-busy", handleUserBusy);
            socketService.off("livekit-call-timeout", handleCallTimeout);
            socketService.off("livekit-call-request-busy", handleCallRequestBusy);
            socketService.off("livekit-call-sync", handleCallSync);
            socketService.off("active-group-calls-list", handleActiveGroupCallsList);
            socketService.off("group-call-status-update", handleGroupCallStatusUpdate);
            socketService.off("livekit-group-call-joined", handleGroupCallJoined);
            socketService.off("livekit-call-chat-message", handleCallChatMessage);
            socketService.off("livekit-call-chat-message-ack", handleCallChatMessageAck);

            ringtoneManager.stopAll();
        };
    }, [user?._id, navigate]);
};
