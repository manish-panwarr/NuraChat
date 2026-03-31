import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Check, CheckCheck, FileText, Download } from "lucide-react";
import { decryptMessage } from "../../utils/encryption";
import { getMediaUrl } from "../../services/chatService";

const MessageBubble = ({ message, isMe, chatMode, isGrouped, otherUser }) => {
    const [decryptedText, setDecryptedText] = useState("");

    useEffect(() => {
        if (chatMode === "temp") {
            setDecryptedText(message.encryptedPayload || message.content || "");
            return;
        }

        // For plaintext fallback (content field)
        if (message.content && !message.encryptedPayload) {
            setDecryptedText(message.content);
            return;
        }

        if (!message.encryptedPayload) {
            setDecryptedText("");
            return;
        }

        let mounted = true;
        decryptMessage(message.encryptedPayload)
            .then((text) => mounted && setDecryptedText(text))
            .catch(() => mounted && setDecryptedText("⚠ Unable to decrypt"));

        return () => { mounted = false; };
    }, [message, chatMode]);

    const timeString = message.createdAt
        ? format(new Date(message.createdAt), "hh:mm a")
        : "";

    const renderMedia = () => {
        if (!message.mediaUrl) return null;
        const url = getMediaUrl(message.mediaUrl);

        if (message.messageType === "image") {
            return (
                <div className="mb-2 rounded-xl overflow-hidden">
                    <img
                        src={url}
                        alt="Shared"
                        className="max-w-full max-h-60 object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                        loading="lazy"
                    />
                </div>
            );
        }

        if (message.messageType === "document" || message.messageType === "audio") {
            return (
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 mb-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                    <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                        <FileText size={16} className="text-teal-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium truncate">{message.mediaMeta?.format || "File"}</p>
                        <p className="text-[10px] text-gray-400">{formatFileSize(message.mediaMeta?.bytes)}</p>
                    </div>
                    <Download size={14} className="text-gray-400 shrink-0" />
                </a>
            );
        }

        return null;
    };

    const renderStatus = () => {
        if (!isMe) return null;
        const status = message.status || "sent";
        if (status === "read") {
            return <CheckCheck size={13} className="text-teal-500" />;
        }
        if (status === "delivered") {
            return <CheckCheck size={13} className="text-gray-400" />;
        }
        return <Check size={13} className="text-gray-400" />;
    };

    return (
        <div className={`flex w-full mb-0.5 group ${isMe ? "justify-end" : "justify-start"}`}>

            {!isMe && (
                <div className={`w-8 h-8 rounded-full mr-2.5 shrink-0 ${isGrouped ? 'opacity-0' : 'opacity-100'} bg-cover bg-center border border-gray-100 dark:border-gray-800 self-end overflow-hidden`}
                    style={otherUser?.profileImage ? { backgroundImage: `url(${otherUser.profileImage})` } : {}}
                >
                    {!otherUser?.profileImage && (
                        <div className="w-full h-full bg-teal-500 flex items-center justify-center text-white text-[11px] font-bold">
                            {(otherUser?.firstName?.[0] || "?").toUpperCase()}
                        </div>
                    )}
                </div>
            )}

            <div className={`max-w-[65%] min-w-[80px] flex flex-col relative ${isGrouped ? '' : 'mt-2'}`}>
                {/* Name & Timestamp for Non-Me */}
                {!isMe && !isGrouped && (
                    <div className="flex items-center gap-2 mb-1 ml-1">
                        <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-200">
                            {otherUser?.firstName} {otherUser?.lastName}
                        </span>
                        <span className="text-[10px] text-gray-400">
                            {timeString}
                        </span>
                    </div>
                )}

                {/* Timestamp for Me */}
                {isMe && !isGrouped && (
                    <div className="flex items-center justify-end gap-2 mb-1 mr-1">
                        <span className="text-[10px] text-gray-400">
                            {timeString}
                        </span>
                        <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-200">
                            You
                        </span>
                    </div>
                )}

                {/* Bubble */}
                <div
                    className={`px-4 py-3 text-[13.5px] leading-relaxed transition-shadow ${
                        isMe
                            ? "rounded-t-[18px] rounded-bl-[18px] rounded-br-[4px] self-end shadow-sm"
                            : "rounded-t-[18px] rounded-br-[18px] rounded-bl-[4px] self-start shadow-sm"
                    } ${isGrouped ? (isMe ? 'rounded-br-[18px]' : 'rounded-bl-[18px]') : ''}`}
                    style={
                        isMe
                            ? { background: 'var(--msg-sent-bg)', color: 'var(--msg-sent-text)' }
                            : { background: 'var(--msg-recv-bg)', color: 'var(--msg-recv-text)', border: '1px solid var(--msg-recv-border)' }
                    }
                >
                    {renderMedia()}
                    {decryptedText && (
                        <p className="whitespace-pre-wrap break-words">{decryptedText}</p>
                    )}

                    {/* Status indicator */}
                    {isMe && (
                        <div className="flex justify-end mt-1 -mb-1">
                            {renderStatus()}
                        </div>
                    )}
                </div>
            </div>

            {isMe && (
                <div className={`w-8 h-8 rounded-full ml-2.5 shrink-0 ${isGrouped ? 'opacity-0' : 'opacity-100'} bg-cover bg-center border border-gray-100 dark:border-gray-800 self-end overflow-hidden`}
                    style={message.senderId?.profileImage ? { backgroundImage: `url(${message.senderId.profileImage})` } : {}}
                >
                    {!message.senderId?.profileImage && (
                        <div className="w-full h-full bg-indigo-500 flex items-center justify-center text-white text-[11px] font-bold">
                            {(message.senderId?.firstName?.[0] || user?.firstName?.[0] || "Y").toUpperCase()}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

function formatFileSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default MessageBubble;
