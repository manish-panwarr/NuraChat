import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Settings } from "lucide-react";
import useAuthStore from "../../store/authStore";
import Avatar from "../common/Avatar";

const Navbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const logout = useAuthStore((s) => s.logout);
    const user = useAuthStore((s) => s.user);

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
        <nav className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50 transition-colors duration-200">
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
            <div className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => {
                    const isActive = location.pathname === link.path;
                    return (
                        <Link
                            key={link.name}
                            to={link.path}
                            className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                                isActive
                                    ? "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                            }`}
                        >
                            {link.name}
                        </Link>
                    );
                })}

                <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-2" />

                {/* User avatar */}
                {user && (
                    <Link to="/profile" className="mr-1">
                        <Avatar src={user.profileImage} name={`${user.firstName} ${user.lastName}`} size="xs" />
                    </Link>
                )}

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all duration-200"
                >
                    <span>Log out</span>
                    <LogOut size={14} />
                </button>
            </div>

            {/* Mobile menu */}
            <div className="flex md:hidden items-center gap-2">
                {user && (
                    <Link to="/profile">
                        <Avatar src={user.profileImage} name={`${user.firstName} ${user.lastName}`} size="xs" />
                    </Link>
                )}
                <Link
                    to="/settings"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <Settings size={18} />
                </Link>
            </div>
        </nav>
    );
};

export default Navbar;
