import React, { useState, useRef, useCallback } from "react";
import { Smile, Mic, Send, Plus, X, FileText, Film, ImageIcon } from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import { toast } from "react-hot-toast";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const ACCEPTED_TYPES = [
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
    "video/mp4", "video/webm", "video/quicktime",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "audio/mpeg", "audio/wav", "audio/ogg", "audio/webm",
].join(",");

const MessageInput = ({
    onSend,
    onTyping,
    onFileUpload,
    disabled = false,
}) => {
    const [message, setMessage] = useState("");
    const [showEmoji, setShowEmoji] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const handleSubmit = useCallback(
        (e) => {
            e?.preventDefault();

            // If there's a file selected, send it
            if (selectedFile) {
                onFileUpload?.(selectedFile, message.trim());
                setSelectedFile(null);
                setFilePreview(null);
                setMessage("");
                setShowEmoji(false);
                inputRef.current?.focus();
                return;
            }

            if (!message.trim() || disabled) return;
            onSend(message.trim());
            setMessage("");
            setShowEmoji(false);
            inputRef.current?.focus();
        },
        [message, disabled, onSend, onFileUpload, selectedFile]
    );

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleInputChange = (e) => {
        setMessage(e.target.value);
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

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            toast.error("File too large. Maximum size is 25MB.");
            return;
        }

        setSelectedFile(file);

        // Generate preview for images
        if (file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (ev) => setFilePreview(ev.target.result);
            reader.readAsDataURL(file);
        } else {
            setFilePreview(null);
        }

        // Reset file input so same file can be re-selected
        e.target.value = "";
    };

    const clearFile = () => {
        setSelectedFile(null);
        setFilePreview(null);
    };

    const getFileIcon = () => {
        if (!selectedFile) return null;
        if (selectedFile.type.startsWith("video/")) return <Film size={20} className="text-purple-500" />;
        if (selectedFile.type.startsWith("image/")) return <ImageIcon size={20} className="text-teal-500" />;
        return <FileText size={20} className="text-orange-500" />;
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    return (
        <div className="relative flex flex-col gap-2 w-full">
            {/* File Preview */}
            {selectedFile && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 animate-fade-in-up">
                    {filePreview ? (
                        <img src={filePreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
                    ) : (
                        <div className="w-12 h-12 rounded-lg bg-white dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                            {getFileIcon()}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-gray-700 dark:text-gray-200 truncate">{selectedFile.name}</p>
                        <p className="text-[11px] text-gray-400">{formatSize(selectedFile.size)}</p>
                    </div>
                    <button
                        onClick={clearFile}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors shrink-0"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Input Row */}
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

                {/* Hidden File Input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_TYPES}
                    onChange={handleFileSelect}
                    className="hidden"
                />

                {/* Plus Button */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
                >
                    <Plus size={18} strokeWidth={1.5} />
                </button>

                {/* Input Bar */}
                <div className="flex-1 border border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-2.5 flex items-center focus-within:border-gray-300 dark:focus-within:border-gray-600 transition-all outline-none border-none border-transparent">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder={selectedFile ? "Add a caption..." : "Type your message"}
                        value={message}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        className="flex-1 bg-transparent border-none outline-none text-[13.5px] text-gray-700 dark:text-gray-100 placeholder-gray-400/70 outline-none border-none"
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

                        {(message.trim() || selectedFile) && (
                            <button
                                onClick={handleSubmit}
                                disabled={disabled || (!message.trim() && !selectedFile)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 dark:hover:bg-gray-300 transition-all shadow-sm"
                            >
                                <Send size={14} className="-ml-0.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MessageInput;
