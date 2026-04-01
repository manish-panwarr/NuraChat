import React, { useMemo } from "react";

const sizeMap = {
    xs: { width: 32, height: 32, text: "text-[10px]" },
    sm: { width: 40, height: 40, text: "text-[11px]" },
    md: { width: 44, height: 44, text: "text-[12px]" },
    lg: { width: 56, height: 56, text: "text-[16px]" },
    xl: { width: 80, height: 80, text: "text-[22px]" },
};

const dotSizeMap = {
    xs: { size: 8, offset: -1 },
    sm: { size: 10, offset: -2 },
    md: { size: 10, offset: -2 },
    lg: { size: 12, offset: -1 },
    xl: { size: 14, offset: 2 },
};

const radiusMap = {
    xs: 8,
    sm: 10,
    md: 12,
    lg: 14,
    xl: 18,
};

// Generate consistent color from name
const getInitialColor = (name) => {
    const colors = [
        "#6366f1", // indigo
        "#14b8a6", // teal
        "#f59e0b", // amber
        "#f43f5e", // rose
        "#8b5cf6", // violet
        "#06b6d4", // cyan
        "#10b981", // emerald
        "#d946ef", // fuchsia
    ];
    let hash = 0;
    for (let i = 0; i < (name || "").length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const Avatar = ({ src, name = "", isOnline, size = "md", className = "" }) => {
    const [imgError, setImgError] = React.useState(false);

    const initials = useMemo(() => {
        const parts = name.trim().split(" ");
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return (parts[0]?.[0] || "?").toUpperCase();
    }, [name]);

    const bgColor = useMemo(() => getInitialColor(name), [name]);
    const sizeInfo = sizeMap[size] || sizeMap.md;
    const dotInfo = dotSizeMap[size] || dotSizeMap.md;
    const borderRadius = radiusMap[size] || radiusMap.md;

    // Reset error if src changes
    React.useEffect(() => { setImgError(false); }, [src]);

    const hasValidImage = src && src.trim() !== "" && !imgError;

    const containerStyle = {
        width: sizeInfo.width,
        height: sizeInfo.height,
        minWidth: sizeInfo.width,
        minHeight: sizeInfo.height,
        borderRadius,
    };

    return (
        <div className={`relative shrink-0 ${className}`} style={{ width: sizeInfo.width, height: sizeInfo.height }}>
            {hasValidImage ? (
                <img
                    src={src}
                    alt={name}
                    style={containerStyle}
                    className="object-cover ring-2 ring-gray-100 dark:ring-gray-800"
                    loading="lazy"
                    onError={() => setImgError(true)}
                />
            ) : (
                <div
                    style={{ ...containerStyle, backgroundColor: bgColor }}
                    className={`flex items-center justify-center text-white font-bold ring-2 ring-gray-100 dark:ring-gray-800 ${sizeInfo.text}`}
                >
                    {initials}
                </div>
            )}

            {/* Online indicator */}
            {isOnline !== undefined && (
                <span
                    style={{
                        width: dotInfo.size,
                        height: dotInfo.size,
                        right: dotInfo.offset,
                        bottom: dotInfo.offset,
                        position: 'absolute',
                    }}
                    className={`rounded-full border-2 border-white dark:border-gray-900 ${isOnline ? "bg-green-500" : "bg-gray-400"}`}
                />
            )}
        </div>
    );
};

export default Avatar;
