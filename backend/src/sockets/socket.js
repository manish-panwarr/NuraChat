import { Server } from "socket.io";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";

let io;
const userSocketMap = new Map(); // userId -> socketId
const socketUserMap = new Map(); // socketId -> userId

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    io.on("connection", async (socket) => {
        const userId = socket.handshake.query.userId;
        if (userId && userId !== "undefined") {
            userSocketMap.set(userId, socket.id);
            socketUserMap.set(socket.id, userId);

            // Mark user online in DB
            try {
                await User.findByIdAndUpdate(userId, {
                    isOnline: true,
                    lastSeen: new Date(),
                });
            } catch { }

            io.emit("user-status", { userId, isOnline: true });

            // Send the full list of online users to the newly connected user
            const onlineUserIds = Array.from(userSocketMap.keys());
            socket.emit("online-users-list", onlineUserIds);
        }

        // --- Send Message (emit to receiver) ---
        socket.on("send-message", (msg) => {
            const receiverId = msg.receiverId;
            if (receiverId) {
                const receiverSocketId = userSocketMap.get(receiverId);
                if (receiverSocketId) {
                    socket.to(receiverSocketId).emit("new-message", msg);
                }
            }
        });

        // --- WebRTC Signaling ---
        socket.on("call-user", ({ to, offer }) => {
            const targetSocketId = userSocketMap.get(to);
            if (targetSocketId) {
                socket.to(targetSocketId).emit("incoming-call", { from: userId, offer });
            }
        });

        socket.on("answer-call", ({ to, answer }) => {
            const targetSocketId = userSocketMap.get(to);
            if (targetSocketId) {
                socket.to(targetSocketId).emit("call-answered", { from: userId, answer });
            }
        });

        socket.on("ice-candidate", ({ to, candidate }) => {
            const targetSocketId = userSocketMap.get(to);
            if (targetSocketId) {
                socket.to(targetSocketId).emit("ice-candidate", { from: userId, candidate });
            }
        });

        // --- Typing Indicator ---
        socket.on("typing", ({ to, isTyping }) => {
            const targetSocketId = userSocketMap.get(to);
            if (targetSocketId) {
                socket.to(targetSocketId).emit("typing", { from: userId, isTyping });
            }
        });

        // --- Message Status Updates ---
        socket.on("message-delivered", ({ messageId, to }) => {
            const targetSocketId = userSocketMap.get(to);
            if (targetSocketId) {
                socket
                    .to(targetSocketId)
                    .emit("message-status-update", { messageId, status: "delivered" });
            }
        });

        socket.on("message-read", ({ messageId, to }) => {
            const targetSocketId = userSocketMap.get(to);
            if (targetSocketId) {
                socket
                    .to(targetSocketId)
                    .emit("message-status-update", { messageId, status: "read" });
            }
        });

        // --- Batch Read: Mark all messages in a chat as read ---
        socket.on("message-read-batch", async ({ chatId, readerId }) => {
            try {
                // Update all unread messages from the other user to "read"
                const result = await Message.updateMany(
                    {
                        chatId,
                        senderId: { $ne: readerId },
                        status: { $ne: "read" },
                    },
                    { $set: { status: "read" } }
                );

                if (result.modifiedCount > 0) {
                    // Find the sender to notify them
                    const messages = await Message.find({ chatId, senderId: { $ne: readerId } })
                        .select("senderId")
                        .lean();

                    const senderIds = [...new Set(messages.map((m) => m.senderId.toString()))];

                    for (const senderId of senderIds) {
                        const senderSocketId = userSocketMap.get(senderId);
                        if (senderSocketId) {
                            socket.to(senderSocketId).emit("messages-read-batch", {
                                chatId,
                                readBy: readerId,
                            });
                        }
                    }
                }
            } catch (err) {
                console.error("Batch read error:", err);
            }
        });

        // --- Notification: Emit when receiver is online but in different chat ---
        socket.on("send-notification", ({ to, from, message, chatId }) => {
            const targetSocketId = userSocketMap.get(to);
            if (targetSocketId) {
                socket.to(targetSocketId).emit("notification", {
                    from,
                    message,
                    chatId,
                    timestamp: new Date().toISOString(),
                });
            }
        });

        // --- Join/Leave Chat Room ---
        socket.on("join-chat", (chatId) => {
            socket.join(`chat:${chatId}`);
        });

        socket.on("leave-chat", (chatId) => {
            socket.leave(`chat:${chatId}`);
        });

        // --- Disconnect ---
        socket.on("disconnect", async () => {
            const disconnectedUserId = socketUserMap.get(socket.id);
            if (disconnectedUserId) {
                userSocketMap.delete(disconnectedUserId);
                socketUserMap.delete(socket.id);

                try {
                    await User.findByIdAndUpdate(disconnectedUserId, {
                        isOnline: false,
                        lastSeen: new Date(),
                    });
                } catch { }
                io.emit("user-status", {
                    userId: disconnectedUserId,
                    isOnline: false,
                });
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
    return userSocketMap.get(userId);
};

export const getOnlineUserIds = () => {
    return Array.from(userSocketMap.keys());
};
