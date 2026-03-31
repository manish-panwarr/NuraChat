import { onlineUsers, activeCalls } from "../utils/onlineUsers.js";

export default function registerPresence(io, socket) {

  socket.on("user-online", (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log("User online:", userId);
  });

  socket.on("disconnect", () => {
    for (let [userId, sId] of onlineUsers.entries()) {
      if (sId === socket.id) {
        onlineUsers.delete(userId);
        activeCalls.delete(userId);
        console.log("User offline:", userId);
        break;
      }
    }
  });
}
