import { Server } from "socket.io";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import GroupMember from "../models/groupMember.model.js";
import fs from "fs";
import path from "path";

const debugLogPath = path.join(process.cwd(), "backend_debug.log");
export const writeToDebugLog = (message) => {
    try {
        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] ${message}\n`;
        fs.appendFileSync(debugLogPath, logLine);
    } catch (e) {
        console.error("Failed to write to debug log file:", e);
    }
    console.log(message);
};

let io;
const userSocketMap = new Map();
const socketUserMap = new Map();
const userCallStates = new Map();
export const activeCalls = new Map();

const CALL_STATUS = Object.freeze({
    OUTGOING_CALL: "outgoing_call",
    INCOMING_CALL: "incoming_call",
    RINGING: "ringing",
    ACCEPTED: "accepted",
    CONNECTED: "connected",
});

const toClientCallStatus = (callState) => {
    if (!callState) return null;
    if (callState.status === "ringing") {
        return callState.role === "caller" ? CALL_STATUS.OUTGOING_CALL : CALL_STATUS.INCOMING_CALL;
    }
    return callState.status;
};

//@desc Centralized helper to emit events to all connected sockets of a user
export const emitToUser = (userId, event, data) => {
    const socketIds = userSocketMap.get(userId);
    if (socketIds) {
        socketIds.forEach((socketId) => {
            io.to(socketId).emit(event, data);
        });
    }
};

//@desc Centralized helper to emit events to all active members of a group
export const emitToGroup = async (groupId, event, data) => {
    try {
        const members = await GroupMember.find({ groupId, status: "accepted" }).select("userId");
        members.forEach((m) => {
            emitToUser(m.userId.toString(), event, data);
        });
    } catch (e) {
        console.error("Error in emitToGroup:", e);
    }
};

//@desc Helper functions for Group Call status broadcasts
const emitGroupCallStatus = async (groupId, roomName, type, participantsCount) => {
    try {
        if (!groupId) return;
        const members = await GroupMember.find({ groupId, status: "accepted" }).select("userId");
        for (const m of members) {
            emitToUser(m.userId.toString(), "group-call-status-update", {
                groupId,
                active: true,
                roomName,
                type,
                participantsCount,
            });
        }
    } catch (e) {
        console.error("Error in emitGroupCallStatus:", e);
    }
};

//@desc Helper functions for Group Call status broadcasts
const emitGroupCallEnded = async (groupId, roomName) => {
    try {
        if (!groupId) return;
        const members = await GroupMember.find({ groupId, status: "accepted" }).select("userId");
        for (const m of members) {
            emitToUser(m.userId.toString(), "group-call-status-update", {
                groupId,
                active: false,
                roomName,
            });
        }
    } catch (e) {
        console.error("Error in emitGroupCallEnded:", e);
    }
};

//@desc Initialize socket
export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    const disconnectTimeouts = new Map();

    io.on("connection", async (socket) => {
        const userId = socket.handshake.query.userId;
        writeToDebugLog(`[Socket Connection] socket.id=${socket.id}, userId=${userId}`);

        if (userId && userId !== "undefined") {
            if (!userSocketMap.has(userId)) {
                userSocketMap.set(userId, new Set());
            }
            userSocketMap.get(userId).add(socket.id);
            socketUserMap.set(socket.id, userId);

            // Cancel any pending disconnect timeout for this user (reconnect heartbeat)
            if (disconnectTimeouts.has(userId)) {
                clearTimeout(disconnectTimeouts.get(userId));
                disconnectTimeouts.delete(userId);
                writeToDebugLog(`[Socket Connection] Reconnect detected. Cancelled offline timeout for userId=${userId}`);
            } else {
                // Mark user online in DB
                try {
                    await User.findByIdAndUpdate(userId, {
                        isOnline: true,
                        lastSeen: new Date(),
                    });
                } catch { }

                io.emit("user-status", { userId, isOnline: true });
            }

            const onlineUserIds = Array.from(userSocketMap.keys());
            socket.emit("online-users-list", onlineUserIds);

            const callState = userCallStates.get(userId);
            writeToDebugLog(`[Socket Connection] Syncing call state for userId=${userId}: ${JSON.stringify(callState || null)}`);

            if (callState) {
                socket.emit("livekit-call-sync", {
                    status: toClientCallStatus(callState),
                    role: callState.role,
                    roomName: callState.roomName,
                    peerId: callState.peerId,
                    peerName: callState.peerName,
                    type: callState.type,
                    isGroup: callState.isGroup || false,
                    groupId: callState.groupId,
                    startTime: callState.startTime,
                });
            } else {
                socket.emit("livekit-call-sync", null);
            }

            for (const [roomName, call] of activeCalls.entries()) {
                if (call.callerId === userId) {
                    if (call.disconnectTimeoutId) {
                        clearTimeout(call.disconnectTimeoutId);
                        delete call.disconnectTimeoutId;
                        console.log(`[Socket] Caller reconnected. Restored call ${roomName} for user ${userId}.`);
                    }
                    call.callerSocketId = socket.id;
                } else if (call.receiverId === userId) {
                    if (call.disconnectTimeoutId) {
                        clearTimeout(call.disconnectTimeoutId);
                        delete call.disconnectTimeoutId;
                        console.log(`[Socket] Receiver reconnected. Restored call ${roomName} for user ${userId}.`);
                    }
                    call.receiverSocketId = socket.id;
                } else if (call.groupId && call.participantSockets) {
                    const pendingTimeoutKey = `disconnectTimeout_${userId}`;
                    if (call[pendingTimeoutKey]) {
                        clearTimeout(call[pendingTimeoutKey]);
                        delete call[pendingTimeoutKey];
                        console.log(`[Socket] Group participant reconnected. Restored call ${roomName} for user ${userId}.`);
                    }
                    call.participantSockets.set(socket.id, userId);
                }
            }

            try {
                const userGroups = await GroupMember.find({ userId, status: "accepted" }).select("groupId");
                const activeGroupCallsList = [];
                for (const ug of userGroups) {
                    for (const [roomName, call] of activeCalls.entries()) {
                        if (call.groupId && call.groupId.toString() === ug.groupId.toString()) {
                            activeGroupCallsList.push({
                                groupId: call.groupId,
                                active: true,
                                roomName,
                                type: call.type,
                                participantsCount: call.participants.size,
                            });
                        }
                    }
                }
                if (activeGroupCallsList.length > 0) {
                    socket.emit("active-group-calls-list", activeGroupCallsList);
                }
            } catch (e) {
                console.error("Error sending active group calls list:", e);
            }
        }

        //Chat & Messaging Events

        socket.on("send-message", (msg) => {
            const receiverId = msg.receiverId;
            if (receiverId) {
                emitToUser(receiverId, "new-message", msg);
            }
        });

        socket.on("typing", ({ to, isTyping }) => {
            emitToUser(to, "typing", { from: userId, isTyping });
        });

        socket.on("message-delivered", ({ messageId, to }) => {
            emitToUser(to, "message-status-update", { messageId, status: "delivered" });
        });

        socket.on("message-read", ({ messageId, to }) => {
            emitToUser(to, "message-status-update", { messageId, status: "read" });
        });

        socket.on("message-read-batch", async ({ chatId, readerId }) => {
            try {
                const result = await Message.updateMany(
                    {
                        chatId,
                        senderId: { $ne: readerId },
                        status: { $ne: "read" },
                    },
                    { $set: { status: "read" } }
                );

                if (result.modifiedCount > 0) {
                    const messages = await Message.find({ chatId, senderId: { $ne: readerId } })
                        .select("senderId")
                        .lean();

                    const senderIds = [...new Set(messages.map((m) => m.senderId.toString()))];

                    for (const senderId of senderIds) {
                        emitToUser(senderId, "messages-read-batch", {
                            chatId,
                            readBy: readerId,
                        });
                    }
                }
            } catch (err) {
                console.error("Batch read error:", err);
            }
        });

        socket.on("send-notification", ({ to, from, message, chatId }) => {
            emitToUser(to, "notification", {
                from,
                message,
                chatId,
                timestamp: new Date().toISOString(),
            });
        });

        socket.on("join-chat", (chatId) => {
            socket.join(`chat:${chatId}`);
        });

        socket.on("leave-chat", (chatId) => {
            socket.leave(`chat:${chatId}`);
        });


        // Temp (P2P) Messaging
        socket.on("temp-message", ({ to, message }) => {
            if (userSocketMap.has(to)) {
                emitToUser(to, "temp-message", { from: userId, message });
            } else {
                socket.emit("temp-user-offline", { userId: to });
            }
        });

        socket.on("temp-mode-request", ({ to, fromName }) => {
            emitToUser(to, "temp-mode-request", { from: userId, fromName });
        });

        socket.on("temp-mode-accepted", ({ to }) => {
            emitToUser(to, "temp-mode-accepted", { from: userId });
        });

        socket.on("temp-mode-declined", ({ to }) => {
            emitToUser(to, "temp-mode-declined", { from: userId });
        });

        socket.on("temp-mode-off", ({ to }) => {
            emitToUser(to, "temp-mode-off", { from: userId });
        });

        socket.on("check-user-online", ({ targetUserId }, callback) => {
            const isOnline = userSocketMap.has(targetUserId);
            if (typeof callback === "function") {
                callback({ isOnline });
            }
        });

        // WebRTC Passthrough 
        socket.on("call-user", ({ to, offer }) => {
            emitToUser(to, "incoming-call", { from: userId, offer });
        });

        socket.on("answer-call", ({ to, answer }) => {
            emitToUser(to, "call-answered", { from: userId, answer });
        });

        socket.on("ice-candidate", ({ to, candidate }) => {
            emitToUser(to, "ice-candidate", { from: userId, candidate });
        });

        // LiveKit 1-to-1 Call Signaling
        socket.on("livekit-call-user", ({ to, roomName, type, callerName, recipientName }) => {
            writeToDebugLog(`[Socket livekit-call-user] from=${userId}, to=${to}, roomName=${roomName}, type=${type}`);

            if (!to || !roomName) {
                writeToDebugLog(`[Socket livekit-call-user] Abort: Missing to or roomName`);
                return;
            }

            const targetSockets = userSocketMap.get(to);
            if (!targetSockets || targetSockets.size === 0) {
                writeToDebugLog(`[Socket livekit-call-user] Target offline: to=${to}`);
                emitToUser(userId, "livekit-call-declined", { from: to, reason: "unavailable" });
                return;
            }

            // 1. Prevent caller starting multiple calls
            const callerExistingState = userCallStates.get(userId);
            if (callerExistingState && callerExistingState.status !== "idle") {
                if (callerExistingState.roomName === roomName) {
                    writeToDebugLog(`[Socket livekit-call-user] Ignore duplicate call-user emit for roomName=${roomName}`);
                    return;
                }
                writeToDebugLog(`[Socket livekit-call-user] Caller busy: callerState=${JSON.stringify(callerExistingState)}`);
                emitToUser(userId, "livekit-user-busy", { from: userId });
                return;
            }

            // 2. Busy check: Is receiver already in another call?
            const receiverExistingState = userCallStates.get(to);
            if (receiverExistingState && receiverExistingState.status !== "idle") {
                if (receiverExistingState.roomName === roomName) {
                    writeToDebugLog(`[Socket livekit-call-user] Ignore duplicate call-user emit for receiver on roomName=${roomName}`);
                    return;
                }
                writeToDebugLog(`[Socket livekit-call-user] Receiver busy: receiverState=${JSON.stringify(receiverExistingState)}`);
                emitToUser(userId, "livekit-user-busy", { from: to });
                emitToUser(to, "livekit-call-request-busy", { from: userId, callerName, type, roomName });
                return;
            }

            writeToDebugLog(`[Socket livekit-call-user] Initializing call between from=${userId} and to=${to}`);

            userCallStates.set(userId, {
                status: "ringing",
                role: "caller",
                roomName,
                peerId: to,
                peerName: recipientName || "User",
                type,
            });
            userCallStates.set(to, {
                status: "ringing",
                role: "receiver",
                roomName,
                peerId: userId,
                peerName: callerName || "User",
                type,
            });

            // 3. Ring timeout: auto-cancel after 40 seconds if not answered
            const timeoutId = setTimeout(() => {
                const call = activeCalls.get(roomName);
                if (call && call.status === "ringing") {
                    writeToDebugLog(`[Socket livekit-call-user] Ring timeout for roomName=${roomName}`);
                    activeCalls.delete(roomName);
                    userCallStates.delete(call.callerId);
                    userCallStates.delete(call.receiverId);
                    emitToUser(call.callerId, "livekit-call-timeout", { roomName });
                    emitToUser(call.receiverId, "livekit-call-timeout", { roomName });
                }
            }, 40000);

            activeCalls.set(roomName, {
                callerId: userId,
                receiverId: to,
                status: "ringing",
                timeoutId,
                callerSocketId: socket.id,
            });

            writeToDebugLog(`[Socket livekit-call-user] Call state set to ringing. Signaling receiver=${to}`);
            emitToUser(to, "livekit-incoming-call", { from: userId, roomName, type, callerName });
        });

        socket.on("livekit-call-accepted", ({ to, roomName }) => {
            writeToDebugLog(`[Socket livekit-call-accepted] from=${userId}, to=${to}, roomName=${roomName}`);
            const call = activeCalls.get(roomName);

            if (call) {
                clearTimeout(call.timeoutId);
                call.status = "connected";
                call.startTime = Date.now();
                call.receiverSocketId = socket.id;
                call.participants = new Set([call.callerId, call.receiverId]);
                call.participantSockets = new Map([
                    [call.callerSocketId, call.callerId],
                    [socket.id, userId]
                ]);

                const callerState = userCallStates.get(call.callerId);
                if (callerState) {
                    callerState.status = CALL_STATUS.CONNECTED;
                    callerState.startTime = call.startTime;
                }

                const receiverState = userCallStates.get(call.receiverId);
                if (receiverState) {
                    receiverState.status = CALL_STATUS.CONNECTED;
                    receiverState.startTime = call.startTime;
                }

                // Emit to caller: navigate to call page
                emitToUser(call.callerId, "livekit-call-accepted", { from: userId, roomName, startTime: call.startTime });
                // Emit to receiver: confirm they can proceed to join LiveKit room
                emitToUser(call.receiverId, "livekit-call-join-ready", { from: call.callerId, roomName, startTime: call.startTime });
                writeToDebugLog(`[Socket livekit-call-accepted] Room updated in activeCalls. room=${roomName}, caller=${call.callerId}, receiver=${userId}, startTime=${call.startTime}`);
            } else {
                writeToDebugLog(`[Socket livekit-call-accepted] No activeCalls entry for room ${roomName}. Falling back to userCallStates.`);
                const receiverState = userCallStates.get(userId);
                const callerId = receiverState?.peerId || to;

                if (callerId) {
                    const startTime = Date.now();
                    const callerState = userCallStates.get(callerId);
                    if (callerState) {
                        callerState.status = CALL_STATUS.CONNECTED;
                        callerState.startTime = startTime;
                    }
                    if (receiverState) {
                        receiverState.status = CALL_STATUS.CONNECTED;
                        receiverState.startTime = startTime;
                    }
                    emitToUser(callerId, "livekit-call-accepted", { from: userId, roomName, startTime });
                    emitToUser(userId, "livekit-call-join-ready", { from: callerId, roomName, startTime });
                    writeToDebugLog(`[Socket livekit-call-accepted] Fallback accept emitted to caller ${callerId}, startTime=${startTime}`);
                } else {
                    writeToDebugLog(`[Socket livekit-call-accepted] Cannot resolve caller for room ${roomName}, userId ${userId}. Event dropped.`);
                }
            }
        });

        socket.on("livekit-call-declined", ({ to }) => {
            writeToDebugLog(`[Socket livekit-call-declined] from=${userId}, to=${to}`);
            const callerState = userCallStates.get(to);
            const receiverState = userCallStates.get(userId);

            let roomName = null;
            if (receiverState && receiverState.status === "ringing") {
                roomName = receiverState.roomName;
            } else if (callerState && callerState.status === "ringing") {
                roomName = callerState.roomName;
            }

            if (roomName) {
                const call = activeCalls.get(roomName);
                if (call) {
                    clearTimeout(call.timeoutId);
                    if (call.disconnectTimeoutId) clearTimeout(call.disconnectTimeoutId);
                    activeCalls.delete(roomName);
                }
            }

            userCallStates.delete(userId);
            userCallStates.delete(to);

            emitToUser(to, "livekit-call-declined", { from: userId });
        });

        socket.on("livekit-call-ended", ({ to, roomName }) => {
            writeToDebugLog(`[Socket livekit-call-ended] from=${userId}, to=${to}, roomName=${roomName}`);

            const call = activeCalls.get(roomName);
            if (call) {
                if (call.participants && call.participants.size > 2) {
                    call.participants.delete(userId);
                    if (call.participantSockets) {
                        call.participantSockets.delete(socket.id);
                    }
                    userCallStates.delete(userId);

                    // Notify remaining participants
                    call.participants.forEach((pId) => {
                        emitToUser(pId, "livekit-call-ended", { from: userId, roomName, isParticipantLeave: true });
                    });

                    if (call.groupId) {
                        emitGroupCallStatus(call.groupId, roomName, call.type, call.participants.size);
                    }
                    writeToDebugLog(`[Socket livekit-call-ended] Upgraded call. User ${userId} left. Remaining: ${call.participants.size}`);
                    return;
                }

                clearTimeout(call.timeoutId);
                if (call.disconnectTimeoutId) clearTimeout(call.disconnectTimeoutId);
                activeCalls.delete(roomName);
                if (call.callerId) userCallStates.delete(call.callerId);
                if (call.receiverId) userCallStates.delete(call.receiverId);
                if (call.participants) {
                    call.participants.forEach((pId) => {
                        userCallStates.delete(pId);
                    });
                }
                const peerId = call.callerId === userId ? call.receiverId : call.callerId;
                emitToUser(peerId, "livekit-call-ended", { from: userId, roomName });
                writeToDebugLog(`[Socket livekit-call-ended] Cleaned up roomName=${roomName}. Peer notified=${peerId}`);
            } else {
                const myState = userCallStates.get(userId);
                const resolvedPeer = to || myState?.peerId;
                writeToDebugLog(`[Socket livekit-call-ended] Fallback cleanup: resolvedPeer=${resolvedPeer}`);
                userCallStates.delete(userId);
                if (resolvedPeer) {
                    userCallStates.delete(resolvedPeer);
                    emitToUser(resolvedPeer, "livekit-call-ended", { from: userId, roomName });
                }
            }
        });

        socket.on("livekit-force-clear-state", () => {
            const myState = userCallStates.get(userId);
            if (!myState) return;

            const roomName = myState.roomName;
            const peerId = myState.peerId;

            if (roomName) {
                const call = activeCalls.get(roomName);
                if (call) {
                    clearTimeout(call.timeoutId);
                    if (call.disconnectTimeoutId) clearTimeout(call.disconnectTimeoutId);
                    activeCalls.delete(roomName);
                    userCallStates.delete(call.callerId);
                    userCallStates.delete(call.receiverId);
                } else {
                    userCallStates.delete(userId);
                    if (peerId) userCallStates.delete(peerId);
                }
                if (peerId) {
                    emitToUser(peerId, "livekit-call-ended", { from: userId, roomName, reason: "force-clear" });
                }
            } else {
                userCallStates.delete(userId);
            }
            console.log(`[Socket] Force-cleared call state for user ${userId}`);
        });

        socket.on("livekit-user-busy", ({ to }) => {
            emitToUser(to, "livekit-user-busy", { from: userId });
        });


        // LiveKit Call Upgrades & Temporary In-Call Chat
        socket.on("livekit-invite-user", ({ to, roomName, type, callerName }) => {
            writeToDebugLog(`[Socket livekit-invite-user] from=${userId}, to=${to}, roomName=${roomName}, type=${type}`);
            if (!to || !roomName) return;

            const call = activeCalls.get(roomName);
            if (call) {
                if (!call.invitedUsers) {
                    call.invitedUsers = new Set();
                }
                call.invitedUsers.add(to);

                if (!call.participants) {
                    call.participants = new Set([call.callerId, call.receiverId]);
                }
                emitToUser(to, "livekit-incoming-call", {
                    from: userId,
                    roomName,
                    type,
                    callerName: callerName || "User",
                    isGroup: true,
                    groupId: call.groupId || null,
                    groupName: "Group Call",
                });
            }
        });

        socket.on("livekit-join-call-chat", ({ roomName }) => {
            socket.join(roomName);
            writeToDebugLog(`[Socket] user=${userId} joined call chat room=${roomName}`);
        });

        socket.on("livekit-call-chat-message", ({ roomName, message, senderName, id }) => {
            writeToDebugLog(`[Socket livekit-call-chat-message] roomName=${roomName}, from=${userId}, senderName=${senderName}, id=${id}`);
            socket.to(roomName).emit("livekit-call-chat-message", {
                id,
                from: userId,
                senderName,
                message,
                timestamp: Date.now()
            });
            socket.emit("livekit-call-chat-message-ack", { id });
        });

        // LiveKit Group Call Signaling
        socket.on("livekit-group-call-init", async ({ groupId, roomName, type, callerName, groupName }) => {
            if (!groupId || !roomName) return;
            socket.join(roomName);

            let call = activeCalls.get(roomName);
            if (!call) {
                call = {
                    groupId,
                    callerId: userId,
                    type,
                    status: "connected",
                    participants: new Set([userId]),
                    startTime: Date.now(),
                    participantSockets: new Map([[socket.id, userId]]),
                };
                activeCalls.set(roomName, call);
            } else {
                if (call.participantSockets) {
                    call.participantSockets.set(socket.id, userId);
                }
            }

            userCallStates.set(userId, { status: "connected", roomName, type, isGroup: true, groupId });

            try {
                const members = await GroupMember.find({ groupId, status: "accepted" }).select("userId");
                const onlineMemberIds = members
                    .map((m) => m.userId.toString())
                    .filter((mId) => mId !== userId && userSocketMap.has(mId));

                onlineMemberIds.forEach((memberId) => {
                    emitToUser(memberId, "livekit-incoming-call", {
                        from: userId,
                        roomName,
                        type,
                        callerName,
                        isGroup: true,
                        groupId,
                        groupName,
                    });
                });

                emitGroupCallStatus(groupId, roomName, type, call.participants.size);
            } catch (err) {
                console.error("Error initializing group call:", err);
            }
        });

        socket.on("livekit-group-call-join", ({ roomName }) => {
            if (!roomName) return;
            socket.join(roomName);
            const call = activeCalls.get(roomName);
            if (call) {
                call.participants.add(userId);
                if (!call.participantSockets) {
                    call.participantSockets = new Map();
                }
                call.participantSockets.set(socket.id, userId);
                userCallStates.set(userId, { status: "connected", roomName, type: call.type, isGroup: true, groupId: call.groupId });

                socket.emit("livekit-group-call-joined", { startTime: call.startTime, type: call.type });

                emitGroupCallStatus(call.groupId, roomName, call.type, call.participants.size);
            }
        });

        socket.on("livekit-group-call-leave", ({ roomName }) => {
            if (!roomName) return;
            const call = activeCalls.get(roomName);
            if (call) {
                const pendingTimeoutKey = `disconnectTimeout_${userId}`;
                if (call[pendingTimeoutKey]) {
                    clearTimeout(call[pendingTimeoutKey]);
                    delete call[pendingTimeoutKey];
                }
                call.participants.delete(userId);
                if (call.participantSockets) {
                    call.participantSockets.delete(socket.id);
                }
                userCallStates.delete(userId);

                if (call.participants.size === 0) {
                    activeCalls.delete(roomName);
                    emitGroupCallEnded(call.groupId, roomName);
                } else {
                    emitGroupCallStatus(call.groupId, roomName, call.type, call.participants.size);
                }
            }
        });

        // Disconnect Handler

        socket.on("disconnect", async () => {
            const disconnectedUserId = socketUserMap.get(socket.id);
            writeToDebugLog(`[Socket disconnect] socket.id=${socket.id}, disconnectedUserId=${disconnectedUserId}`);

            for (const [roomName, call] of activeCalls.entries()) {
                const isCallerSocket = call.callerSocketId === socket.id;
                const isReceiverSocket = call.receiverSocketId === socket.id;
                const isCallerUserId = disconnectedUserId && disconnectedUserId === call.callerId;
                const isReceiverUserId = disconnectedUserId && disconnectedUserId === call.receiverId;

                if (isCallerSocket || isReceiverSocket || isCallerUserId || isReceiverUserId) {
                    const peerId = (disconnectedUserId === call.callerId) ? call.receiverId : call.callerId;

                    if (!call.disconnectTimeoutId) {
                        writeToDebugLog(`[Socket disconnect] Call participant ${disconnectedUserId} disconnected (no other active sockets). Starting 15s grace period timeout for room ${roomName}.`);

                        call.disconnectTimeoutId = setTimeout(() => {
                            clearTimeout(call.timeoutId);
                            activeCalls.delete(roomName);

                            userCallStates.delete(call.callerId);
                            userCallStates.delete(call.receiverId);

                            emitToUser(peerId, "livekit-call-ended", {
                                from: disconnectedUserId || userId,
                                roomName,
                                reason: "disconnect",
                            });
                            writeToDebugLog(`[Socket disconnect] 15s grace period expired. Call ${roomName} ended.`);
                        }, 15000);
                    }
                } else if (call.participantSockets && call.participantSockets.has(socket.id)) {
                    const gpUserId = call.participantSockets.get(socket.id);
                    call.participantSockets.delete(socket.id);

                    const pendingTimeoutKey = `disconnectTimeout_${gpUserId}`;
                    console.log(`[Socket] Group call participant ${gpUserId} disconnected. Starting 15s grace period timeout for room ${roomName}.`);

                    call[pendingTimeoutKey] = setTimeout(() => {
                        call.participants.delete(gpUserId);
                        userCallStates.delete(gpUserId);
                        delete call[pendingTimeoutKey];

                        if (call.participants.size === 0) {
                            activeCalls.delete(roomName);
                            emitGroupCallEnded(call.groupId, roomName);
                        } else {
                            emitGroupCallStatus(call.groupId, roomName, call.type, call.participants.size);
                        }
                        console.log(`[Socket] 15s grace period expired. Removed group call participant ${gpUserId} from room ${roomName}.`);
                    }, 15000);
                }
            }

            if (disconnectedUserId) {
                socketUserMap.delete(socket.id);
                const socketIds = userSocketMap.get(disconnectedUserId);
                if (socketIds) {
                    socketIds.delete(socket.id);
                    if (socketIds.size === 0) {
                        userSocketMap.delete(disconnectedUserId);

                        if (disconnectTimeouts.has(disconnectedUserId)) {
                            clearTimeout(disconnectTimeouts.get(disconnectedUserId));
                        }

                        const timeoutId = setTimeout(async () => {
                            disconnectTimeouts.delete(disconnectedUserId);

                            let hasActiveCall = false;
                            for (const [roomName, activeCall] of activeCalls.entries()) {
                                const isParticipant = activeCall.callerId === disconnectedUserId ||
                                    activeCall.receiverId === disconnectedUserId ||
                                    (activeCall.participants && activeCall.participants.has(disconnectedUserId));
                                if (isParticipant) {
                                    hasActiveCall = true;
                                    break;
                                }
                            }
                            if (!hasActiveCall) {
                                userCallStates.delete(disconnectedUserId);
                            }

                            try {
                                await User.findByIdAndUpdate(disconnectedUserId, {
                                    isOnline: false,
                                    lastSeen: new Date(),
                                });
                            } catch (e) {
                                console.error("Error updating user offline status:", e);
                            }

                            io.emit("user-status", {
                                userId: disconnectedUserId,
                                isOnline: false,
                            });
                            writeToDebugLog(`[Socket disconnect] User ${disconnectedUserId} marked offline after 3s heartbeat delay.`);
                        }, 3000);

                        disconnectTimeouts.set(disconnectedUserId, timeoutId);
                    }
                }
            }
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) throw new Error("Socket.io not initialized");
    return io;
};

export const getSocketId = (userId) => {
    const socketIds = userSocketMap.get(userId);
    return socketIds && socketIds.size > 0 ? Array.from(socketIds)[0] : null;
};

export const getOnlineUserIds = () => {
    return Array.from(userSocketMap.keys());
};
