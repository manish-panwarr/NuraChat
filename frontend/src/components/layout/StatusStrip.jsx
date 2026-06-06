import React, { useState, useEffect } from "react";
import { Edit2, Check, X, Clock, UserCog } from "lucide-react";
import { IoIosInfinite } from "react-icons/io";
import { MdOutlineTranslate } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import useTheme from "../../hooks/useTheme";
import { format } from "date-fns";
import { IoIosSunny } from "react-icons/io";
import { BsMoonFill } from "react-icons/bs";
import userService from "../../services/userService";
import { toast } from "react-hot-toast";


const StatusStrip = () => {
    const user = useAuthStore((s) => s.user);
    const updateUser = useAuthStore((s) => s.updateUser);
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [time, setTime] = useState(new Date());
    const [isEditingStatus, setIsEditingStatus] = useState(false);
    const [statusText, setStatusText] = useState(user?.statusText || "");

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        setStatusText(user?.statusText || "");
    }, [user?.statusText]);

    const handleSaveStatus = async () => {
        try {
            const res = await userService.updateMyProfile({ statusText });
            updateUser(res.user || { statusText });
            toast.success("Status updated!");
            setIsEditingStatus(false);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update status");
        }
    };
    const handleCancelStatus = () => {
        setStatusText(user?.statusText || "");
        setIsEditingStatus(false);
    };

    return (
        <div className="w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800/60 shrink-0 z-30 py-[8px]">
            <div className="flex items-center justify-between px-4 md:px-6 h-9 text-[11px]">

                {/* Left: Tabs */}
                <div className="flex justify-center items-center  w-[22%] gap-1 shrink-0">
                    {/* <button className="px-7 py-1 flex flex-col justify-center items-center   rounded-sm text-[13px] font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 transition-colors cursor-pointer border-none">
                        <IoIosInfinite size={15} /> Features...
                    </button> */}
                    <button
                        onClick={() => navigate("/settings")}
                        className="px-7 flex  gap-1 py-1 rounded-sm text-[13px] font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer border-none ">
                        <MdOutlineTranslate size={17} /> Translate
                    </button>
                </div>

                {/* Center: Status */}
                <div className="hidden md:flex flex-1 items-center justify-center min-w-0 mx-5 ">
                    {isEditingStatus ? (
                        <div className="flex items-center gap-1.5 max-w-md w-full border-b-1 border-gray-200 dark:border-gray-700 ">
                            <input
                                type="text"
                                value={statusText}
                                onChange={(e) => setStatusText(e.target.value)}
                                className="flex-1 bg-gray-50  border-none border-b-1  rounded-lg px-3 py-1 text-[13px] text-gray-700 dark:text-gray-200 outline-none  bg-transparent"
                                autoFocus
                                maxLength={100}
                                placeholder="What's on your mind?"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveStatus();
                                    if (e.key === "Escape") handleCancelStatus();
                                }}
                            />
                            <button onClick={handleSaveStatus} className="p-1 text-teal-500 hover:text-teal-600 rounded-md hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"><Check size={15} /></button>
                            <button onClick={handleCancelStatus} className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X size={15} /></button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-gray-400 mr-[8px] text-[15px] shrink-0">Status :</span>
                            <span className="text-gray-600 dark:text-gray-300 text-[13.5px] tracking-[1px] truncate max-w-[30vw]">
                                {user?.statusText || "Available"}
                            </span>
                            <button
                                onClick={() => setIsEditingStatus(true)}
                                className="p-0.5  rounded transition-colors shrink-0"
                            >
                                <Edit2 size={15} className="text-gray-500 ml-[5vw]" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Right: Info items */}
                <div className="flex items-center gap-5 shrink-0">

                    {/* Time */}
                    <div className="hidden lg:flex items-center gap- px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800/50">
                        <Clock size={16} className="text-gray-400 mr-[8px]" />
                        <span className="text-gray-600 dark:text-gray-300 font-medium text-[13px]">
                            {format(time, "h:mm a")}
                        </span>
                    </div>

                    <div className="hidden md:block w-px h-3.5 bg-gray-200 dark:bg-gray-700" />

                    {/* Theme Toggle */}
                    <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800/50">
                        <span className={`text-[13px] ${isDark ? "text-gray-300 font-semibold" : "text-gray-400"}`}><BsMoonFill size={15} /></span>
                        <button
                            onClick={toggleTheme}
                            className={`w-8 h-4 rounded-full p-0.5 transition-colors ${!isDark ? "bg-teal-500" : "bg-gray-500 dark:bg-gray-600"}`}
                        >
                            <div
                                className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${!isDark ? "translate-x-4" : "translate-x-0"}`}
                            />
                        </button>
                        <span className={`text-[13px] ${!isDark ? "text-gray-700 font-semibold" : "text-gray-400"}`}><IoIosSunny size={18} /></span>
                    </div>

                    <div className="hidden sm:block w-px h-3.5 bg-gray-200 dark:bg-gray-700" />

                    {/* Edit Profile */}
                    <button
                        onClick={() => navigate("/profile")}
                        className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md text-[14px] font-medium text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                        <UserCog size={16} />
                        <span>Profile</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StatusStrip;
