import React, { useState, useEffect } from 'react';
import { FaPen, FaSmile } from 'react-icons/fa';
import ThemeToggle from '../common/ThemeToggle';

const SubHeader = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex items-center justify-between px-8 py-2 mb-6">
            {/* Left: Tabs */}
            <div className="flex bg-gray-200 dark:bg-gray-800 rounded-full p-1">
                <button className="px-6 py-2 bg-white dark:bg-gray-700 rounded-full shadow-sm text-sm font-semibold text-gray-800 dark:text-white transition">
                    Public Messages
                </button>
                <button className="px-6 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">
                    Private Messages
                </button>
            </div>

            {/* Middle: Status */}
            <div className="hidden md:flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 max-w-lg truncate">
                <span className="font-medium whitespace-nowrap">Your status:</span>
                <div className="flex items-center gap-2 italic truncate">
                    <span>Hey team, I'm away from laptop, see you after 20 minutes</span>
                    <FaSmile className="text-yellow-500" />
                    <FaPen className="cursor-pointer hover:text-gray-800 dark:hover:text-white" />
                </div>
            </div>

            {/* Right: Utils */}
            <div className="flex items-center gap-6">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Local Time: <span className="text-gray-800 dark:text-white">{formatTime(time)}</span>
                </div>

                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1">
                    <span className="text-xs font-semibold text-gray-500">Theme:</span>
                    <ThemeToggle />
                </div>

                <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    Edit Your Profile
                </button>
            </div>
        </div>
    );
};

export default SubHeader;
