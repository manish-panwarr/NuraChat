import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Check, CheckCheck, FileText, Download, X, Play, ZoomIn, ZoomOut, RotateCcw, ArrowDownToLine } from "lucide-react";
import { decryptMessage } from "../../utils/encryption";
import { getMediaUrl } from "../../services/chatService";

const MessageBubble = ({ message, isMe, chatMode, isGrouped, otherUser }) => {
    const [decryptedText, setDecryptedText] = useState("");
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [videoFullscreen, setVideoFullscreen] = useState(false);

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

    const closeLightbox = () => { setLightboxOpen(false); setZoomLevel(1); };

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
                    {/* Image Card */}
                    <div className="rounded-xl overflow-hidden relative group/media mb-1.5" style={{ maxWidth: "300px" }}>
                        <img
                            src={url}
                            alt="Shared"
                            className="w-full rounded-xl cursor-pointer transition-all duration-200 group-hover/media:brightness-[0.92]"
                            style={{ maxHeight: "300px", objectFit: "cover" }}
                            loading="lazy"
                            onClick={() => setLightboxOpen(true)}
                        />
                        {/* Overlay controls */}
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

                    {/* Lightbox */}
                    {lightboxOpen && (
                        <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col animate-fade-in" onClick={closeLightbox}>
                            {/* Toolbar */}
                            <div className="flex items-center justify-between px-5 py-4 z-10 bg-gradient-to-b from-black/60 to-transparent">
                                <span className="text-white/70 text-[13px]">{isMe ? "You" : otherUser?.firstName} · {timeString}</span>
                                <div className="flex items-center gap-1.5">
                                    <button onClick={(e) => { e.stopPropagation(); setZoomLevel(z => Math.max(z - 0.5, 0.5)); }} className="w-7 h-7 rounded-lg bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"><ZoomOut size={14} /></button>
                                    <span className="text-white/60 text-[11px] font-mono w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
                                    <button onClick={(e) => { e.stopPropagation(); setZoomLevel(z => Math.min(z + 0.5, 4)); }} className="w-7 h-7 rounded-lg bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"><ZoomIn size={14} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setZoomLevel(1); }} className="w-7 h-7 rounded-lg bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"><RotateCcw size={14} /></button>
                                    <div className="w-px h-4 bg-white/20 mx-1" />
                                    <button onClick={(e) => handleDownload(e, url, fileName)} className="w-7 h-7 rounded-lg bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"><ArrowDownToLine size={14} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); closeLightbox(); }} className="w-7 h-7 rounded-lg bg-white/10 text-white hover:bg-red-500/80 flex items-center justify-center"><X size={14} /></button>
                                </div>
                            </div>
                            <div className="flex-1 flex items-center justify-center overflow-auto p-4" onClick={(e) => e.stopPropagation()}>
                                <img src={url} alt="Full size" className="transition-transform duration-200 rounded-lg shadow-2xl" style={{ transform: `scale(${zoomLevel})`, maxHeight: '85vh', maxWidth: '90vw', objectFit: 'contain' }} draggable={false} />
                            </div>
                        </div>
                    )}
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
                        {/* Duration badge */}
                        {message.mediaMeta?.duration && (
                            <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-white backdrop-blur-sm">
                                <Play size={8} />
                                <span>{Math.round(message.mediaMeta.duration)}s</span>
                            </div>
                        )}
                        {/* Download button */}
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

                    {/* Video fullscreen */}
                    {videoFullscreen && (
                        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center animate-fade-in" onClick={() => setVideoFullscreen(false)}>
                            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                                <button onClick={(e) => handleDownload(e, url, fileName)} className="w-9 h-9 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"><ArrowDownToLine size={16} /></button>
                                <button onClick={(e) => { e.stopPropagation(); setVideoFullscreen(false); }} className="w-9 h-9 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"><X size={18} /></button>
                            </div>
                            <video src={url} controls autoPlay className="max-w-[90vw] max-h-[90vh] rounded-xl" onClick={(e) => e.stopPropagation()} />
                        </div>
                    )}
                </>
            );
        }

        // Document / Audio
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
        <div className={`flex w-full mb-0.5 group ${isMe ? "justify-end" : "justify-start"}`}>
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
                        {/* <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{otherUser?.firstName}</span> */}
                        <span className="text-[10px] text-gray-400">{timeString}</span>
                    </div>
                )}
                {isMe && !isGrouped && (
                    <div className="flex items-center justify-end gap-1.5 mb-0.5 mr-0.5">
                        <span className="text-[10px] text-gray-400">{timeString}</span>
                    </div>
                )}

                {/* Bubble */}
                <div
                    className={`px-3 py-2 text-[13px] leading-relaxed ${isMe
                        ? "rounded-t-[14px] rounded-bl-[14px] rounded-br-[3px] self-end shadow-sm"
                        : "rounded-t-[14px] rounded-br-[14px] rounded-bl-[3px] self-start shadow-sm"
                        } ${isGrouped ? (isMe ? 'rounded-br-[14px]' : 'rounded-bl-[14px]') : ''}`}
                    style={
                        isMe
                            ? { background: 'var(--msg-sent-bg)', color: 'var(--msg-sent-text)' }
                            : { background: 'var(--msg-recv-bg)', color: 'var(--msg-recv-text)', border: '1px solid var(--msg-recv-border)' }
                    }
                >
                    {renderMedia()}
                    {decryptedText && <p className="whitespace-pre-wrap break-words">{decryptedText}</p>}
                    {isMe && (
                        <div className="flex justify-end mt-0.5 -mb-0.5">{renderStatus()}</div>
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
