import { onlineUsers } from "../utils/onlineUsers.js";

export default function registerTempChat(io, socket) {

  socket.on("temp-message", ({ fromUserId, toUserId, message }) => {
    const targetSocket = onlineUsers.get(toUserId);

    if (!targetSocket) {
      socket.emit("temp-error", "User offline");
      return;
    }

    io.to(targetSocket).emit("temp-message", {
      from: fromUserId,
      message
    });
  });
}
