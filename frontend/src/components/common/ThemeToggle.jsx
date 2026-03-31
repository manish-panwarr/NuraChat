import React from "react";
import { FaSun, FaMoon } from "react-icons/fa";
import useTheme from "../../hooks/useTheme";

const ThemeToggle = ({ className = "" }) => {
    const { isDark, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={`relative p-2.5 rounded-xl transition-all duration-300 ${isDark
                    ? "bg-gray-800 text-yellow-400 hover:bg-gray-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                } ${className}`}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
        >
            <div className="relative w-5 h-5">
                <FaSun
                    size={20}
                    className={`absolute inset-0 transition-all duration-300 ${isDark
                            ? "opacity-0 rotate-90 scale-0"
                            : "opacity-100 rotate-0 scale-100"
                        }`}
                />
                <FaMoon
                    size={20}
                    className={`absolute inset-0 transition-all duration-300 ${isDark
                            ? "opacity-100 rotate-0 scale-100"
                            : "opacity-0 -rotate-90 scale-0"
                        }`}
                />
            </div>
        </button>
    );
};

export default ThemeToggle;
