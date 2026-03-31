import { onlineUsers, activeCalls } from "../utils/onlineUsers.js";

export default function registerCall(io, socket) {

  // Caller wants to start call
  socket.on("call-user", ({ fromUserId, toUserId, offer }) => {

    const targetSocket = onlineUsers.get(toUserId);

    if (!targetSocket) {
      socket.emit("call-error", "User offline");
      return;
    }

    if (activeCalls.get(toUserId)) {
      socket.emit("call-busy", "User already in call");
      return;
    }

    // Mark both as busy
    activeCalls.set(fromUserId, true);
    activeCalls.set(toUserId, true);

    // 🔥 RoomId = receiver userId
    socket.join(toUserId);

    io.to(targetSocket).emit("incoming-call", {
      fromUserId,
      roomId: toUserId,
      offer
    });
  });

  // Receiver accepts call
  socket.on("accept-call", ({ fromUserId, roomId, answer }) => {
    socket.join(roomId);

    io.to(roomId).emit("call-accepted", {
      fromUserId,
      answer
    });
  });

  // ICE candidates
  socket.on("ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice-candidate", candidate);
  });

  // Call end
  socket.on("end-call", ({ userId }) => {
    activeCalls.delete(userId);
    socket.leaveAll();
  });
}
