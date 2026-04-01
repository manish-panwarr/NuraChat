import { io } from "socket.io-client";
import { API_URL } from "../config";

const SOCKET_URL = API_URL.replace("/api", "");

class SocketService {
    socket = null;
    _userId = null;
    _retryCount = 0;
    _maxRetries = 5;
    _reconnectTimer = null;
    _listeners = new Map(); // event -> Set of callbacks (persistent registry)

    connect(userId) {
        this._userId = userId;
        this._retryCount = 0;

        if (this.socket?.connected) return;

        // Clean up existing socket
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }

        this.socket = io(SOCKET_URL, {
            query: { userId },
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: this._maxRetries,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
        });

        this.socket.on("connect", () => {
            console.log("[Socket] Connected:", this.socket.id);
            this._retryCount = 0;
            // Re-apply ALL registered listeners on every connect/reconnect
            this._reapplyListeners();
        });

        this.socket.on("disconnect", (reason) => {
            console.log("[Socket] Disconnected:", reason);
            if (reason === "io server disconnect") {
                this._attemptReconnect();
            }
        });

        this.socket.on("connect_error", (err) => {
            console.warn("[Socket] Connect error:", err.message);
        });

        // Apply any existing listeners immediately (socket exists now but may not be connected yet)
        this._reapplyListeners();
    }

    _reapplyListeners() {
        if (!this.socket) return;
        for (const [event, callbacks] of this._listeners) {
            for (const cb of callbacks) {
                // Remove first to prevent duplicates, then re-add
                this.socket.off(event, cb);
                this.socket.on(event, cb);
            }
        }
    }

    _attemptReconnect() {
        if (this._retryCount >= this._maxRetries || !this._userId) return;
        this._retryCount++;
        const delay = Math.min(1000 * Math.pow(2, this._retryCount), 10000);
        if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
        this._reconnectTimer = setTimeout(() => {
            if (!this.socket?.connected && this._userId) {
                this.socket?.connect();
            }
        }, delay);
    }

    disconnect() {
        if (this._reconnectTimer) {
            clearTimeout(this._reconnectTimer);
            this._reconnectTimer = null;
        }
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }
        this._userId = null;
        this._retryCount = 0;
        // Keep _listeners so they can be re-applied on next connect
    }

    isConnected() {
        return this.socket?.connected || false;
    }

    emit(event, data) {
        if (this.socket?.connected) {
            this.socket.emit(event, data);
        } else {
            console.warn("[Socket] Cannot emit, not connected:", event);
        }
    }

    on(event, callback) {
        // Always store in persistent registry
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(callback);

        // If socket exists, apply immediately
        if (this.socket) {
            this.socket.off(event, callback); // prevent duplicate
            this.socket.on(event, callback);
        }
    }

    off(event, callback) {
        // Remove from persistent registry
        if (this._listeners.has(event)) {
            this._listeners.get(event).delete(callback);
            if (this._listeners.get(event).size === 0) {
                this._listeners.delete(event);
            }
        }
        // Remove from socket
        if (this.socket) {
            this.socket.off(event, callback);
        }
    }

    clearAllListeners() {
        this._listeners.clear();
    }
}

const socketService = new SocketService();
export default socketService;
