import React from "react";

const SkeletonLoader = ({ type = "chat-list", count = 5 }) => {
    const shimmer =
        "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent";

    if (type === "chat-list") {
        return (
            <div className="space-y-3 p-2">
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                        {/* Avatar */}
                        <div
                            className={`w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 ${shimmer}`}
                        />
                        <div className="flex-1 space-y-2">
                            {/* Name */}
                            <div
                                className={`h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700 ${shimmer}`}
                            />
                            {/* Last message */}
                            <div
                                className={`h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-800 ${shimmer}`}
                            />
                        </div>
                        {/* Time */}
                        <div
                            className={`h-3 w-10 rounded bg-gray-100 dark:bg-gray-800 ${shimmer}`}
                        />
                    </div>
                ))}
            </div>
        );
    }

    if (type === "messages") {
        return (
            <div className="space-y-4 p-4">
                {Array.from({ length: count }).map((_, i) => {
                    const isRight = i % 3 === 0;
                    return (
                        <div
                            key={i}
                            className={`flex ${isRight ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`rounded-2xl p-4 ${shimmer} ${isRight
                                        ? "bg-indigo-100 dark:bg-indigo-900/30"
                                        : "bg-gray-100 dark:bg-gray-800"
                                    }`}
                                style={{
                                    width: `${Math.random() * 30 + 20}%`,
                                    minWidth: "120px",
                                }}
                            >
                                <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
                                {i % 2 === 0 && (
                                    <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    if (type === "profile") {
        return (
            <div className="p-6 space-y-6">
                <div className="flex flex-col items-center gap-4">
                    <div
                        className={`w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 ${shimmer}`}
                    />
                    <div
                        className={`h-5 w-32 rounded bg-gray-200 dark:bg-gray-700 ${shimmer}`}
                    />
                    <div
                        className={`h-4 w-48 rounded bg-gray-100 dark:bg-gray-800 ${shimmer}`}
                    />
                </div>
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className={`h-10 rounded-xl bg-gray-100 dark:bg-gray-800 ${shimmer}`}
                        />
                    ))}
                </div>
            </div>
        );
    }

    return null;
};

export default SkeletonLoader;
