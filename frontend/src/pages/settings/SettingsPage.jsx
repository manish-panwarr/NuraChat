import React from "react";
import { ArrowLeft, Moon, Sun, LogOut, User, Shield, Palette, Bell, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import useUiStore from "../../store/uiStore";
import Avatar from "../../components/common/Avatar";
import { toast } from "react-hot-toast";

const SettingsPage = () => {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const theme = useUiStore((s) => s.theme);
    const toggleTheme = useUiStore((s) => s.toggleTheme);
    const isDark = theme === "dark";

    const handleLogout = () => {
        logout();
        toast.success("Logged out");
        navigate("/login");
    };

    if (!user) return null;

    const SettingItem = ({ icon: Icon, label, desc, action, danger = false }) => (
        <button
            onClick={action}
            className={`flex items-center gap-4 w-full p-4 rounded-xl transition-all text-left group ${
                danger
                    ? "hover:bg-red-50 dark:hover:bg-red-900/10"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
            }`}
        >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                danger
                    ? "bg-red-50 dark:bg-red-900/20"
                    : "bg-gray-50 dark:bg-gray-800"
            }`}>
                <Icon size={18} className={danger ? "text-red-400" : "text-gray-400 group-hover:text-teal-500 transition-colors"} />
            </div>
            <div className="flex-1 min-w-0">
                <p className={`text-[14px] font-medium ${danger ? "text-red-500" : "text-gray-700 dark:text-gray-200"}`}>{label}</p>
                {desc && <p className="text-[12px] text-gray-400 mt-0.5">{desc}</p>}
            </div>
        </button>
    );

    return (
        <div className="h-screen flex flex-col" style={{ background: "var(--bg-color)" }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50">
                <button
                    onClick={() => navigate("/")}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <ArrowLeft size={18} />
                </button>
                <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 font-display">Settings</h1>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

                    {/* User Info Card */}
                    <div className="panel-glass p-6 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/profile")}>
                        <Avatar src={user.profileImage} name={`${user.firstName} ${user.lastName}`} size="lg" isOnline={true} />
                        <div className="flex-1 min-w-0">
                            <h2 className="text-[16px] font-bold text-gray-800 dark:text-gray-100 font-display">
                                {user.firstName} {user.lastName}
                            </h2>
                            <p className="text-[13px] text-gray-400 truncate">{user.email}</p>
                            <p className="text-[12px] text-teal-500 font-medium mt-1">View Profile →</p>
                        </div>
                    </div>

                    {/* Appearance */}
                    <div className="panel-glass overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800/50">
                            <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider">Appearance</h3>
                        </div>
                        <div className="p-2">
                            <div className="flex items-center gap-4 p-4 rounded-xl">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                    {isDark ? <Moon size={18} className="text-indigo-400" /> : <Sun size={18} className="text-amber-500" />}
                                </div>
                                <div className="flex-1">
                                    <p className="text-[14px] font-medium text-gray-700 dark:text-gray-200">Theme</p>
                                    <p className="text-[12px] text-gray-400">{isDark ? "Dark mode" : "Light mode"}</p>
                                </div>
                                <button
                                    onClick={toggleTheme}
                                    className={`w-12 h-6 rounded-full p-0.5 transition-colors ${
                                        isDark ? "bg-indigo-500" : "bg-gray-300"
                                    }`}
                                >
                                    <div
                                        className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                                            isDark ? "translate-x-6" : "translate-x-0"
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Account */}
                    <div className="panel-glass overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800/50">
                            <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider">Account</h3>
                        </div>
                        <div className="p-2">
                            <SettingItem
                                icon={User}
                                label="Edit Profile"
                                desc="Update your personal information"
                                action={() => navigate("/profile")}
                            />
                            <SettingItem
                                icon={Shield}
                                label="Security"
                                desc="Change password and security settings"
                                action={() => navigate("/profile")}
                            />
                            <SettingItem
                                icon={Bell}
                                label="Notifications"
                                desc="Manage notification preferences"
                                action={() => toast("Coming soon!", { icon: "🔔" })}
                            />
                        </div>
                    </div>

                    {/* About */}
                    <div className="panel-glass overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800/50">
                            <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider">About</h3>
                        </div>
                        <div className="p-2">
                            <SettingItem
                                icon={Info}
                                label="About NuraChat"
                                desc="Version 1.0.0 • Real-time encrypted messaging"
                                action={() => {}}
                            />
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="panel-glass overflow-hidden">
                        <div className="p-2">
                            <SettingItem
                                icon={LogOut}
                                label="Log Out"
                                desc="Sign out of your account"
                                action={handleLogout}
                                danger={true}
                            />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
