import React, { useState, useRef, useCallback } from "react";
import { Smile, Mic, Send, Plus } from "lucide-react";
import EmojiPicker from "./EmojiPicker";

const MessageInput = ({
    onSend,
    onTyping,
    disabled = false,
}) => {
    const [message, setMessage] = useState("");
    const [showEmoji, setShowEmoji] = useState(false);
    const inputRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const handleSubmit = useCallback(
        (e) => {
            e?.preventDefault();
            if (!message.trim() || disabled) return;

            onSend(message.trim());
            setMessage("");
            setShowEmoji(false);
            inputRef.current?.focus();
        },
        [message, disabled, onSend]
    );

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleInputChange = (e) => {
        setMessage(e.target.value);

        // Emit typing with debounce
        onTyping?.(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            onTyping?.(false);
        }, 2000);
    };

    const handleEmojiSelect = (emoji) => {
        setMessage((prev) => prev + emoji);
        inputRef.current?.focus();
    };

    return (
        <div className="relative flex items-center gap-2.5 w-full">
            {/* Emoji Picker Overlay */}
            {showEmoji && (
                <div className="absolute bottom-full mb-3 right-10 z-50 shadow-lg rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
                    <EmojiPicker
                        onSelect={handleEmojiSelect}
                        onClose={() => setShowEmoji(false)}
                    />
                </div>
            )}

            {/* Plus Button */}
            <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0">
                <Plus size={18} strokeWidth={1.5} />
            </button>

            {/* Input Bar */}
            <div className="flex-1 border border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-2.5 flex items-center focus-within:border-gray-300 dark:focus-within:border-gray-600 transition-all">
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Type your message"
                    value={message}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    className="flex-1 bg-transparent border-none outline-none text-[13.5px] text-gray-700 dark:text-gray-100 placeholder-gray-400/70"
                />

                <div className="flex items-center gap-2.5 shrink-0 ml-2">
                    <button
                        type="button"
                        onClick={() => setShowEmoji((prev) => !prev)}
                        className={`text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ${showEmoji ? 'text-amber-500' : ''}`}
                    >
                        <Smile size={18} strokeWidth={1.5} />
                    </button>

                    <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <Mic size={18} strokeWidth={1.5} />
                    </button>
                    
                    {message.trim() && (
                        <button
                            onClick={handleSubmit}
                            disabled={disabled || !message.trim()}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 dark:hover:bg-gray-300 transition-all shadow-sm"
                        >
                            <Send size={14} className="-ml-0.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessageInput;
