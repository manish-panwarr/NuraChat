import { io } from "socket.io-client";
import { API_URL } from "../config";

const SOCKET_URL = API_URL.replace("/api", "");

class SocketService {
    socket = null;

    connect(userId) {
        if (!this.socket) {
            this.socket = io(SOCKET_URL, {
                query: { userId },
                transports: ["websocket"],
            });

            this.socket.on("connect", () => {
                console.log("Socket connected:", this.socket.id);
            });

            this.socket.on("disconnect", () => {
                console.log("Socket disconnected");
            });
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    emit(event, data) {
        if (this.socket) {
            this.socket.emit(event, data);
        }
    }

    on(event, callback) {
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event, callback) {
        if (this.socket) {
            this.socket.off(event, callback);
        }
    }
}

const socketService = new SocketService();
export default socketService;
