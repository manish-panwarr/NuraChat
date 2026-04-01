import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Settings, Bell, X, Menu } from "lucide-react";
import useAuthStore from "../../store/authStore";
import useChatStore from "../../store/chatStore";
import useNotificationStore from "../../store/notificationStore";
import groupService from "../../services/groupService";
import { toast } from "react-hot-toast";
import Avatar from "../common/Avatar";

const Navbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const logout = useAuthStore((s) => s.logout);
    const user = useAuthStore((s) => s.user);
    
    // Replace old chatStore notifications with new notificationStore
    const notifications = useNotificationStore((s) => s.notifications);
    const unreadCount = useNotificationStore((s) => s.unreadCount);
    const clearAll = useNotificationStore((s) => s.clearAll);
    const markAsRead = useNotificationStore((s) => s.markAsRead);
    const removeNotification = useNotificationStore((s) => s.removeNotification);
    
    const [showNotifications, setShowNotifications] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    // Call fetchNotifications on mount
    React.useEffect(() => {
        if (user) {
            useNotificationStore.getState().fetchNotifications();
        }
    }, [user]);

    const handleAcceptInvite = async (notif) => {
        try {
            await groupService.acceptInvite(notif.data.groupId);
            toast.success(`Joined ${notif.data.groupName}!`);
            removeNotification(notif._id);
            // We should ideally refetch groups here, let's trigger it if groupStore is mounted
            // by using an event or just let user navigate to group tab
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to accept invite");
        }
    };

    const handleRejectInvite = async (notif) => {
        try {
            await groupService.rejectInvite(notif.data.groupId);
            toast.success(`Rejected invite to ${notif.data.groupName}`);
            removeNotification(notif._id);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to reject invite");
        }
    };

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const navLinks = [
        { name: "Chat", path: "/" },
        { name: "Profile", path: "/profile" },
        { name: "Settings", path: "/settings" },
    ];

    return (
        <>
            <nav className="flex items-center justify-between px-6 py-3.5 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50 transition-colors duration-200">
                {/* Logo */}
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white shadow-sm">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-teal-600 dark:text-teal-400 tracking-tight font-display">
                        NuraChat
                    </h1>
                </div>

                {/* Navigation Links */}
                <div className="hidden md:flex items-center gap-2">
                    {navLinks.map((link) => {
                        const isActive = location.pathname === link.path;
                        return (
                            <Link
                                key={link.name}
                                to={link.path}
                                className={`px-4 py-1.5 rounded-lg text-[14px] font-medium transition-all duration-200 ${isActive
                                    ? "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    }`}
                            >
                                {link.name}
                            </Link>
                        );
                    })}

                    <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-2" />

                    {/* Notification Bell */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative"
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span className="notification-badge">
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notification Dropdown */}
                        {showNotifications && (
                            <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-50 animate-slide-down overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                                    <h3 className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">Notifications</h3>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={clearAll}
                                            className="text-[11px] text-teal-500 font-medium hover:text-teal-600 transition-colors"
                                        >
                                            Clear all
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                    {notifications.length === 0 ? (
                                        <div className="py-8 text-center text-gray-400 text-[13px]">
                                            No notifications
                                        </div>
                                    ) : (
                                        notifications.map((notif) => (
                                            <div
                                                key={notif._id}
                                                className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-0 ${!notif.isRead ? 'bg-teal-50/30 dark:bg-teal-900/10' : ''}`}
                                            >
                                                <div className="flex justify-between items-start gap-2">
                                                    <div>
                                                        <h4 className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">
                                                            {notif.title}
                                                        </h4>
                                                        <p className="text-[12px] text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
                                                            {notif.body}
                                                        </p>
                                                    </div>
                                                    {!notif.isRead && (
                                                        <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0 mt-1" />
                                                    )}
                                                </div>

                                                {notif.type === "group_invite" && (
                                                    <div className="flex gap-2 mt-2.5">
                                                        <button
                                                            onClick={() => handleAcceptInvite(notif)}
                                                            className="flex-1 py-1.5 bg-teal-500 hover:bg-teal-600 text-white text-[11px] font-medium rounded-lg transition-colors"
                                                        >
                                                            Accept
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectInvite(notif)}
                                                            className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-[11px] font-medium rounded-lg transition-colors"
                                                        >
                                                            Decline
                                                        </button>
                                                    </div>
                                                )}

                                                <div className="mt-2 text-[10px] text-gray-400">
                                                    {new Date(notif.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User avatar */}
                    {user && (
                        <Link to="/profile" className="mr-1">
                            <Avatar src={user.profileImage} name={`${user.firstName} ${user.lastName}`} size="sm" />
                        </Link>
                    )}

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[14px] font-medium text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all duration-200"
                    >
                        <span>Log out</span>
                        <LogOut size={16} />
                    </button>
                </div>

                {/* Mobile menu */}
                <div className="flex md:hidden items-center gap-2">
                    {/* Mobile Notification Bell */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
                        >
                            <Bell size={17} />
                            {unreadCount > 0 && (
                                <span className="notification-badge">
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {user && (
                        <Link to="/profile">
                            <Avatar src={user.profileImage} name={`${user.firstName} ${user.lastName}`} size="xs" />
                        </Link>
                    )}
                    <button
                        onClick={() => setShowMobileMenu(true)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <Menu size={18} />
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Drawer */}
            <div className={`mobile-drawer-backdrop ${showMobileMenu ? 'open' : ''}`} onClick={() => setShowMobileMenu(false)} />
            <div className={`mobile-drawer bg-white dark:bg-gray-900 shadow-xl ${showMobileMenu ? 'open' : ''}`}>
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-[15px] font-bold text-gray-800 dark:text-gray-100 font-display">Menu</h3>
                    <button
                        onClick={() => setShowMobileMenu(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="p-4 space-y-1">
                    {navLinks.map((link) => {
                        const isActive = location.pathname === link.path;
                        return (
                            <Link
                                key={link.name}
                                to={link.path}
                                onClick={() => setShowMobileMenu(false)}
                                className={`block px-4 py-2.5 rounded-lg text-[14px] font-medium transition-all ${isActive
                                    ? "text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-900/20"
                                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    }`}
                            >
                                {link.name}
                            </Link>
                        );
                    })}
                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-2" />
                    <button
                        onClick={() => { setShowMobileMenu(false); handleLogout(); }}
                        className="w-full text-left px-4 py-2.5 rounded-lg text-[14px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all flex items-center gap-2"
                    >
                        <LogOut size={16} />
                        Log out
                    </button>
                </div>
            </div>

            {/* Click outside to close notifications */}
            {showNotifications && (
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
            )}
        </>
    );
};

export default Navbar;
