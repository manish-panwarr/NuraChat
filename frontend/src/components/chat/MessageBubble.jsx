import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { Check, CheckCheck, FileText, Download, X, Play, ZoomIn, ZoomOut, RotateCcw, ArrowDownToLine, Pencil, Trash2, CheckSquare, Square, Languages, Loader2 } from "lucide-react";
import { decryptMessage } from "../../utils/encryption";
import { getMediaUrl } from "../../services/chatService";
import MediaViewer from "../common/MediaViewer";
import useChatStore from "../../store/chatStore";
import useGroupStore from "../../store/groupStore";
import { toast } from "react-hot-toast";

const MessageBubble = ({
    message,
    isMe,
    chatMode,
    isGrouped,
    otherUser,
    isSelectMode,
    isSelected,
    onToggleSelect,
    onTranslate,
    translationData,
    isTranslating,
}) => {
    const [decryptedText, setDecryptedText] = useState("");
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [videoFullscreen, setVideoFullscreen] = useState(false);

    // Editing state
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState("");
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Context Menu state
    const [menuVisible, setMenuVisible] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const menuRef = useRef(null);
    const touchTimeoutRef = useRef(null);
    const touchStartPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (chatMode === "temp") {
            setDecryptedText(message.encryptedPayload || message.content || "");
            return;
        }
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

    const displayTime = message.isEdited
        ? `Edited · ${timeString}`
        : timeString;

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuVisible(false);
            }
        };
        if (menuVisible) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("touchstart", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, [menuVisible]);

    const handleContextMenu = (e) => {
        if (isSelectMode) return;
        e.preventDefault();

        const left = e.clientX + 180 > window.innerWidth ? window.innerWidth - 190 : e.clientX;
        const top = e.clientY + 130 > window.innerHeight ? window.innerHeight - 140 : e.clientY;

        setMenuPosition({ x: left, y: top });
        setMenuVisible(true);
    };

    // Long press handlers for mobile
    const handleTouchStart = (e) => {
        if (isSelectMode) return;
        const touch = e.touches[0];
        touchStartPos.current = { x: touch.clientX, y: touch.clientY };

        touchTimeoutRef.current = setTimeout(() => {
            e.preventDefault();
            const left = touch.clientX + 180 > window.innerWidth ? window.innerWidth - 190 : touch.clientX;
            const top = touch.clientY + 130 > window.innerHeight ? window.innerHeight - 140 : touch.clientY;

            setMenuPosition({ x: left, y: top });
            setMenuVisible(true);
        }, 600);
    };

    const handleTouchMove = (e) => {
        if (touchTimeoutRef.current) {
            const touch = e.touches[0];
            const dist = Math.hypot(touch.clientX - touchStartPos.current.x, touch.clientY - touchStartPos.current.y);
            if (dist > 8) {
                clearTimeout(touchTimeoutRef.current);
                touchTimeoutRef.current = null;
            }
        }
    };

    const handleTouchEnd = () => {
        if (touchTimeoutRef.current) {
            clearTimeout(touchTimeoutRef.current);
            touchTimeoutRef.current = null;
        }
    };

    const handleMenuAction = (action) => {
        setMenuVisible(false);
        if (action === "select") {
            if (onToggleSelect) onToggleSelect(message._id);
        } else if (action === "edit") {
            setIsEditing(true);
            setEditText(decryptedText);
        } else if (action === "delete") {
            handleDelete();
        } else if (action === "translate") {
            if (onTranslate && decryptedText) {
                onTranslate(message._id, decryptedText);
            }
        } else if (action === "hideTranslation") {
            if (onTranslate && translationData) {
                onTranslate(message._id, null);
            }
        }
    };

    const handleDelete = async () => {
        const confirmDelete = window.confirm("Remove this message from your view?");
        if (!confirmDelete) return;

        try {
            if (message.groupId) {
                await useChatStore.getState().deleteMessageForMe(message._id);
                useGroupStore.getState().deleteGroupMessageForMeLocal(message._id);
            } else {
                await useChatStore.getState().deleteMessageForMe(message._id);
            }
            toast.success("Message hidden");
        } catch {
            toast.error("Failed to delete message");
        }
    };

    const handleSaveEdit = async () => {
        if (!editText.trim()) return;
        if (editText === decryptedText) {
            setIsEditing(false);
            return;
        }

        setIsSavingEdit(true);
        try {
            const { encryptMessage } = await import("../../utils/encryption");
            const encrypted = await encryptMessage(editText);

            await useChatStore.getState().editMessage(message._id, encrypted);

            if (message.groupId) {
                useGroupStore.getState().editGroupMessageLocal(message._id, {
                    encryptedPayload: encrypted,
                    isEdited: true
                });
            }

            setIsEditing(false);
            toast.success("Message edited");
        } catch {
            toast.error("Failed to edit message");
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSaveEdit();
        } else if (e.key === "Escape") {
            setIsEditing(false);
        }
    };

    // Download handler
    const handleDownload = async (e, url, filename) => {
        e.stopPropagation();
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = filename || "download";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch {
            window.open(url, "_blank");
        }
    };

    const renderMedia = () => {
        if (!message.mediaUrl) return null;
        const url = getMediaUrl(message.mediaUrl);
        const fileName = message.mediaMeta?.originalName || "file";

        if (message.messageType === "image") {
            return (
                <>
                    <div className="rounded-xl overflow-hidden relative group/media mb-1.5" style={{ maxWidth: "300px" }}>
                        <img
                            src={url}
                            alt="Shared"
                            className="w-full rounded-xl cursor-pointer transition-all duration-200 group-hover/media:brightness-[0.92]"
                            style={{ maxHeight: "300px", objectFit: "cover" }}
                            loading="lazy"
                            onClick={() => setLightboxOpen(true)}
                        />
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/media:opacity-100 transition-opacity">
                            <button
                                onClick={() => setLightboxOpen(true)}
                                className="w-7 h-7 rounded-lg bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors backdrop-blur-sm"
                            >
                                <ZoomIn size={13} />
                            </button>
                            <button
                                onClick={(e) => handleDownload(e, url, fileName)}
                                className="w-7 h-7 rounded-lg bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors backdrop-blur-sm"
                            >
                                <ArrowDownToLine size={13} />
                            </button>
                        </div>
                    </div>
                    <MediaViewer
                        isOpen={lightboxOpen}
                        onClose={() => setLightboxOpen(false)}
                        mediaUrl={url}
                        mediaType="image"
                        fileName={fileName}
                        title={`${isMe ? "You" : (otherUser?.firstName ? `${otherUser.firstName} ${otherUser.lastName || ""}` : "Partner")} · ${timeString}`}
                    />
                </>
            );
        }

        if (message.messageType === "video") {
            return (
                <>
                    <div className="rounded-xl overflow-hidden relative group/media mb-1.5" style={{ maxWidth: "300px" }}>
                        <video
                            src={url}
                            controls
                            preload="metadata"
                            className="w-full rounded-xl bg-black"
                            style={{ maxHeight: "280px", objectFit: "contain" }}
                            playsInline
                        />
                        {message.mediaMeta?.duration && (
                            <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-white backdrop-blur-sm">
                                <Play size={8} />
                                <span>{Math.round(message.mediaMeta.duration)}s</span>
                            </div>
                        )}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/media:opacity-100 transition-opacity">
                            <button
                                onClick={() => setVideoFullscreen(true)}
                                className="w-7 h-7 rounded-lg bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors backdrop-blur-sm"
                            >
                                <ZoomIn size={13} />
                            </button>
                            <button
                                onClick={(e) => handleDownload(e, url, fileName)}
                                className="w-7 h-7 rounded-lg bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors backdrop-blur-sm"
                            >
                                <ArrowDownToLine size={13} />
                            </button>
                        </div>
                    </div>
                    <MediaViewer
                        isOpen={videoFullscreen}
                        onClose={() => setVideoFullscreen(false)}
                        mediaUrl={url}
                        mediaType="video"
                        fileName={fileName}
                        title={`${isMe ? "You" : (otherUser?.firstName ? `${otherUser.firstName} ${otherUser.lastName || ""}` : "Partner")} · ${timeString}`}
                    />
                </>
            );
        }

        const ext = fileName.split(".").pop()?.toUpperCase() || "FILE";
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 mb-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                style={{ maxWidth: "260px" }}
            >
                <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center shrink-0 relative">
                    <FileText size={15} className="text-teal-500" />
                    <span className="absolute -bottom-0.5 -right-0.5 text-[6px] font-bold bg-teal-500 text-white px-0.5 rounded">{ext}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate">{fileName}</p>
                    <p className="text-[9px] text-gray-400">{formatFileSize(message.mediaMeta?.bytes)}</p>
                </div>
                <Download size={13} className="text-gray-400 shrink-0" />
            </a>
        );
    };

    const renderStatus = () => {
        if (!isMe) return null;
        const status = message.status || "sent";
        if (status === "read") return <CheckCheck size={12} className="text-teal-500" />;
        if (status === "delivered") return <CheckCheck size={12} className="text-gray-400" />;
        return <Check size={12} className="text-gray-400" />;
    };

    return (
        <div
            onClick={() => isSelectMode && onToggleSelect && onToggleSelect(message._id)}
            className={`flex w-full mb-0.5 group items-center ${isMe ? "justify-end" : "justify-start"} ${isSelectMode ? "cursor-pointer hover:bg-slate-100/40 dark:hover:bg-slate-800/20 px-2 rounded-lg" : ""}`}
        >
            {/* Multi select checkbox */}
            {isSelectMode && (
                <div className="mr-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => onToggleSelect && onToggleSelect(message._id)}
                        className="w-5 h-5 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-teal-500 hover:border-teal-500 dark:hover:border-teal-400 transition-colors"
                    >
                        {isSelected ? <CheckSquare size={14} className="fill-teal-50 dark:fill-transparent" /> : <Square size={14} className="text-gray-300 dark:text-gray-600" />}
                    </button>
                </div>
            )}

            {/* Other user avatar */}
            {!isMe && (
                <div className={`w-9 h-9 rounded-full mr-1.5 shrink-0 ${isGrouped ? 'invisible' : ''} bg-cover bg-center border border-gray-100 dark:border-gray-800 self-end overflow-hidden`}
                    style={otherUser?.profileImage ? { backgroundImage: `url(${otherUser.profileImage})` } : {}}
                >
                    {!otherUser?.profileImage && (
                        <div className="w-full h-full bg-teal-500 flex items-center justify-center text-white text-[9px] font-bold">
                            {(otherUser?.firstName?.[0] || "?").toUpperCase()}
                        </div>
                    )}
                </div>
            )}

            <div className={`max-w-[70%] min-w-[70px] flex flex-col ${isGrouped ? '' : 'mt-2'}`}>
                {/* Name & Timestamp */}
                {!isMe && !isGrouped && (
                    <div className="flex items-center gap-1.5 mb-0.5 ml-0.5">
                        <span className="text-[10px] text-gray-400">{displayTime}</span>
                    </div>
                )}
                {isMe && !isGrouped && (
                    <div className="flex items-center justify-end gap-1.5 mb-0.5 mr-0.5">
                        <span className="text-[10px] text-gray-400">{displayTime}</span>
                    </div>
                )}
                {isGrouped && (
                    <div className={`flex items-center gap-1.5 mb-0.5 ${isMe ? 'justify-end mr-0.5' : 'ml-0.5'}`}>
                        <span className="text-[9px] text-gray-400/60 opacity-0 group-hover:opacity-100 transition-opacity">{displayTime}</span>
                    </div>
                )}

                {/* Bubble */}
                <div
                    onContextMenu={handleContextMenu}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className={`px-3 py-2 text-[13px] leading-relaxed relative select-none ${isMe
                        ? "rounded-t-[14px] rounded-bl-[14px] rounded-br-[3px] self-end shadow-sm"
                        : "rounded-t-[14px] rounded-br-[14px] rounded-bl-[3px] self-start shadow-sm"
                        } ${isGrouped ? (isMe ? 'rounded-br-[14px]' : 'rounded-bl-[14px]') : ''}`}
                    style={
                        isMe
                            ? { background: 'var(--msg-sent-bg)', color: 'var(--msg-sent-text)' }
                            : { background: 'var(--msg-recv-bg)', color: 'var(--msg-recv-text)', border: '1px solid var(--msg-recv-border)' }
                    }
                >
                    {isEditing ? (
                        <div className="flex flex-col gap-2 min-w-[260px] sm:min-w-[320px] md:min-w-[420px] max-w-full py-0.5">
                            <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                rows={Math.max(3, Math.min(10, Math.ceil(editText.length / 50)))}
                                className="w-full bg-white/95 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3 text-[13.5px] leading-relaxed outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all custom-scrollbar resize-none"
                                placeholder="Edit message..."
                                autoFocus
                            />
                            <div className="flex items-center justify-end gap-2 shrink-0">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-3.5 py-1.5 text-[12px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-colors border-none bg-transparent cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={isSavingEdit || !editText.trim()}
                                    className="px-4 py-1.5 text-[12px] font-bold text-white bg-teal-500 hover:bg-teal-600 disabled:opacity-50 rounded-xl transition-colors shadow-sm shadow-teal-500/10 border-none cursor-pointer flex items-center justify-center"
                                >
                                    {isSavingEdit ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {renderMedia()}
                            {decryptedText && <p className="whitespace-pre-wrap break-words">{decryptedText}</p>}

                            {/*  Translation Block  */}
                            {isTranslating && isTranslating(message._id) && (
                                <div className="translation-block">
                                    <div className="flex items-center gap-1.5">
                                        <Loader2 size={10} className="animate-spin text-teal-500" />
                                        <span className="translation-label">Translating...</span>
                                    </div>
                                </div>
                            )}
                            {translationData && !isTranslating?.(message._id) && (
                                <div className="translation-block">
                                    <span className="translation-label">
                                        {translationData.sourceLanguage
                                            ? `Translated (${translationData.sourceLanguage} → ${translationData.targetLanguage})`
                                            : `Translated → ${translationData.targetLanguage}`}
                                    </span>
                                    <p className="translation-text">{translationData.translatedText}</p>
                                </div>
                            )}

                            {isMe && (
                                <div className="flex justify-end mt-0.5 -mb-0.5">{renderStatus()}</div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* My avatar */}
            {isMe && (
                <div className={`w-9 h-9 rounded-full ml-1.5 shrink-0 ${isGrouped ? 'invisible' : ''} bg-cover bg-center border border-gray-100 dark:border-gray-800 self-end overflow-hidden`}
                    style={message.senderId?.profileImage ? { backgroundImage: `url(${message.senderId.profileImage})` } : {}}
                >
                    {!message.senderId?.profileImage && (
                        <div className="w-full h-full bg-indigo-500 flex items-center justify-center text-white text-[9px] font-bold">
                            {(message.senderId?.firstName?.[0] || "Y").toUpperCase()}
                        </div>
                    )}
                </div>
            )}

            {/*  Glassmorphic Context Menu */}
            {menuVisible && createPortal(
                <div
                    ref={menuRef}
                    className="fixed bg-white/70 dark:bg-gray-900/75 backdrop-blur-md border border-white/20 dark:border-gray-800/40 rounded-2xl shadow-2xl z-[9999] py-1.5 w-44 animate-scale-in text-left overflow-hidden border-solid"
                    style={{ top: `${menuPosition.y}px`, left: `${menuPosition.x}px` }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/*  Glassmorphic Context Menu */}
                    {isMe && message.messageType === "text" && (
                        <button
                            onClick={() => handleMenuAction("edit")}
                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12.5px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors border-none bg-transparent cursor-pointer"
                        >
                            <Pencil size={14} className="text-teal-500" />
                            <span>Edit Message</span>
                        </button>
                    )}
                    {/* Translate — only for text messages with decrypted content */}
                    {message.messageType === "text" && decryptedText && (
                        translationData ? (
                            <button
                                onClick={() => handleMenuAction("hideTranslation")}
                                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12.5px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors border-none bg-transparent cursor-pointer"
                            >
                                <Languages size={14} className="text-indigo-500" />
                                <span>Hide Translation</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => handleMenuAction("translate")}
                                disabled={isTranslating?.(message._id)}
                                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12.5px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors border-none bg-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isTranslating?.(message._id) ? (
                                    <Loader2 size={14} className="text-indigo-500 animate-spin" />
                                ) : (
                                    <Languages size={14} className="text-indigo-500" />
                                )}
                                <span>{isTranslating?.(message._id) ? "Translating..." : "Translate"}</span>
                            </button>
                        )
                    )}
                    <button
                        onClick={() => handleMenuAction("delete")}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12.5px] font-medium text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-colors border-none bg-transparent cursor-pointer"
                    >
                        <Trash2 size={14} />
                        <span>Delete For Me</span>
                    </button>
                    <button
                        onClick={() => handleMenuAction("select")}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12.5px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors border-none bg-transparent cursor-pointer"
                    >
                        <CheckSquare size={14} className="text-indigo-500" />
                        <span>Select Message</span>
                    </button>
                </div>,
                document.body
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
