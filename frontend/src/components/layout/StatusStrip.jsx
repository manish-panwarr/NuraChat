import React, { useState, useEffect } from "react";
import { Edit2 } from "lucide-react";
import useAuthStore from "../../store/authStore";
import useTheme from "../../hooks/useTheme";
import { format } from "date-fns";

const StatusStrip = () => {
    const user = useAuthStore((s) => s.user);
    const { isDark, toggleTheme } = useTheme();
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800/60 flex items-center justify-between px-6 py-1.5 text-[12px] text-gray-500 dark:text-gray-400">

            {/* Left side: Message type tabs */}
            <div className="flex gap-4 font-medium">
                <button className="text-gray-800 dark:text-gray-200 border-b-2 border-gray-700 dark:border-gray-300 pb-0.5 text-[12px]">
                    Public Messages
                </button>
                <button className="hover:text-gray-800 dark:hover:text-gray-200 pb-0.5 text-[12px] transition-colors">
                    Private Messages
                </button>
            </div>

            {/* Right side: Status, Time, Theme, Edit */}
            <div className="flex items-center gap-6">

                {/* Status */}
                <div className="hidden sm:flex items-center gap-1.5">
                    <span className="text-gray-400">Your status:</span>
                    <span className="text-gray-600 dark:text-gray-300 truncate max-w-[180px]">
                        {user?.statusText || "Hey team, I'm away from laptop..."}
                    </span>
                    <button className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
                        <Edit2 size={12} />
                    </button>
                </div>

                {/* Local Time */}
                <div className="hidden lg:flex items-center gap-1.5">
                    <span className="text-gray-400">Local Time:</span>
                    <span className="text-gray-600 dark:text-gray-300 font-medium">
                        {format(time, "h:mm a")}
                    </span>
                </div>

                {/* Theme Toggle */}
                <div className="hidden md:flex items-center gap-1.5">
                    <span className="text-gray-400">Theme:</span>
                    <span className={isDark ? "text-gray-300 font-medium" : "text-gray-400"}>Dark</span>
                    <button
                        onClick={toggleTheme}
                        className={`w-7 h-3.5 rounded-full p-0.5 transition-colors ${
                            !isDark ? "bg-teal-500" : "bg-gray-400 dark:bg-gray-600"
                        }`}
                    >
                        <div
                            className={`w-2.5 h-2.5 bg-white rounded-full shadow-sm transition-transform ${
                                !isDark ? "translate-x-3.5" : "translate-x-0"
                            }`}
                        />
                    </button>
                    <span className={!isDark ? "text-gray-700 font-medium" : "text-gray-400"}>Light</span>
                </div>

                {/* Edit Profile */}
                <button className="hidden sm:block font-medium hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                    Edit Your Profile
                </button>
            </div>
        </div>
    );
};

export default StatusStrip;
