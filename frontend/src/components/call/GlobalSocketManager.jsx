import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import socketService from "../../services/socketService";
import useAuthStore from "../../store/authStore";
import { useChatSockets } from "../../hooks/sockets/useChatSockets";
import { useGroupSockets } from "../../hooks/sockets/useGroupSockets";
import { useCallSockets } from "../../hooks/sockets/useCallSockets";
import { useNotificationSockets } from "../../hooks/sockets/useNotificationSockets";

const GlobalSocketManager = () => {
    const user = useAuthStore((s) => s.user);
    const navigate = useNavigate();

    // Manage socket connection lifetime
    useEffect(() => {
        if (!user?._id) {
            socketService.disconnect();
            return;
        }

        socketService.connect(user._id);
    }, [user?._id]);

    // Register feature-specific socket event handlers
    useChatSockets(user);
    useGroupSockets(user);
    useCallSockets(user, navigate);
    useNotificationSockets(user);

    return null;
};

export default GlobalSocketManager;
