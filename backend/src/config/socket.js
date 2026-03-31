import { Server } from "socket.io";
import registerPresence from "../sockets/presence.socket.js";
import registerTempChat from "../sockets/tempChat.socket.js";
import registerCall from "../sockets/call.socket.js";

export default function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: "*" }
  });

  io.on("connection", (socket) => {
    registerPresence(io, socket);
    registerTempChat(io, socket);
    registerCall(io, socket);
  });

  return io;
}
