import React, { useMemo } from "react";

const sizeMap = {
    xs: "w-8 h-8 text-xs",
    sm: "w-10 h-10 text-sm",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-lg",
    xl: "w-24 h-24 text-2xl",
};

const dotSizeMap = {
    xs: "w-2 h-2 -right-0 -bottom-0",
    sm: "w-2.5 h-2.5 -right-0.5 -bottom-0.5",
    md: "w-3 h-3 -right-0.5 -bottom-0.5",
    lg: "w-3.5 h-3.5 right-0 bottom-0",
    xl: "w-4 h-4 right-1 bottom-1",
};

// Generate consistent color from name
const getInitialColor = (name) => {
    const colors = [
        "bg-indigo-500",
        "bg-teal-500",
        "bg-amber-500",
        "bg-rose-500",
        "bg-violet-500",
        "bg-cyan-500",
        "bg-emerald-500",
        "bg-fuchsia-500",
    ];
    let hash = 0;
    for (let i = 0; i < (name || "").length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const Avatar = ({ src, name = "", isOnline, size = "md", className = "" }) => {
    const initials = useMemo(() => {
        const parts = name.trim().split(" ");
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return (parts[0]?.[0] || "?").toUpperCase();
    }, [name]);

    const bgColor = useMemo(() => getInitialColor(name), [name]);

    return (
        <div className={`relative shrink-0 ${className}`}>
            {src ? (
                <img
                    src={src}
                    alt={name}
                    className={`${sizeMap[size]} rounded-full object-cover ring-2 ring-gray-50 dark:ring-gray-900`}
                    loading="lazy"
                />
            ) : (
                <div
                    className={`${sizeMap[size]} ${bgColor} rounded-full flex items-center justify-center text-white font-bold ring-2 ring-gray-50 dark:ring-gray-900`}
                >
                    {initials}
                </div>
            )}

            {/* Online indicator */}
            {isOnline !== undefined && (
                <span
                    className={`absolute ${dotSizeMap[size]} rounded-full border-2 border-white dark:border-gray-900 ${isOnline ? "bg-green-500" : "bg-gray-400"
                        }`}
                />
            )}
        </div>
    );
};

export default Avatar;
