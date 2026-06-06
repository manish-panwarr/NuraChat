import { useEffect } from "react";
import socketService from "../../services/socketService";
import useNotificationStore from "../../store/notificationStore";
import { toast } from "react-hot-toast";

export const useNotificationSockets = (user) => {
    useEffect(() => {
        if (!user?._id) return;

        const handleNotification = (notification) => {
            useNotificationStore.getState().addNotification({
                _id: "legacy-" + Date.now(),
                type: "system",
                title: "Message",
                body: notification.message || "New message",
                isRead: false,
                createdAt: new Date().toISOString()
            });
            toast(notification.message || "New message", {
                icon: "💬",
                duration: 3000,
            });
        };

        const handleNewNotification = (notification) => {
            useNotificationStore.getState().addNotification(notification);
            toast(notification.title || "New Activity", {
                icon: "",
                duration: 3000,
            });
        };

        socketService.on("notification", handleNotification);
        socketService.on("new-notification", handleNewNotification);

        return () => {
            socketService.off("notification", handleNotification);
            socketService.off("new-notification", handleNewNotification);
        };
    }, [user?._id]);
};
