import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn, ZoomOut, RotateCcw, ArrowDownToLine, Play, RotateCw } from "lucide-react";

const MediaViewer = ({ isOpen, onClose, mediaUrl, mediaType = "image", fileName = "file", title = "" }) => {
    const [zoomLevel, setZoomLevel] = useState(1);
    const [rotation, setRotation] = useState(0);

    // Reset zoom and rotation when opening new media
    useEffect(() => {
        if (isOpen) {
            setZoomLevel(1);
            setRotation(0);
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen, mediaUrl]);

    if (!isOpen || !mediaUrl) return null;

    const handleDownload = async (e) => {
        e?.stopPropagation();
        try {
            const response = await fetch(mediaUrl);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = fileName || "download";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch {
            window.open(mediaUrl, "_blank");
        }
    };

    const handleZoomIn = (e) => {
        e?.stopPropagation();
        setZoomLevel((z) => Math.min(z + 0.25, 4));
    };

    const handleZoomOut = (e) => {
        e?.stopPropagation();
        setZoomLevel((z) => Math.max(z - 0.25, 0.25));
    };

    const handleRotate = (e) => {
        e?.stopPropagation();
        setRotation((r) => (r + 90) % 360);
    };

    const handleReset = (e) => {
        e?.stopPropagation();
        setZoomLevel(1);
        setRotation(0);
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex flex-col justify-between select-none animate-fade-in font-sans"
            onClick={onClose}
        >
            {/* Top Header / Toolbar */}
            <div
                className="w-full flex items-center justify-between px-6 py-4 z-10 bg-gradient-to-b from-black/80 via-black/40 to-transparent"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col min-w-0 pr-4">
                    {title && <span className="text-white/90 text-sm font-medium truncate">{title}</span>}
                    <span className="text-white/50 text-xs truncate">{fileName}</span>
                </div>

                <div className="flex items-center gap-2">
                    {mediaType === "image" && (
                        <>
                            <button
                                onClick={handleZoomOut}
                                className="w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                                title="Zoom Out"
                            >
                                <ZoomOut size={16} />
                            </button>
                            <span className="text-white/70 text-xs font-mono w-12 text-center select-none">
                                {Math.round(zoomLevel * 100)}%
                            </span>
                            <button
                                onClick={handleZoomIn}
                                className="w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                                title="Zoom In"
                            >
                                <ZoomIn size={16} />
                            </button>
                            <button
                                onClick={handleRotate}
                                className="w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                                title="Rotate"
                            >
                                <RotateCw size={16} />
                            </button>
                            <button
                                onClick={handleReset}
                                className="w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                                title="Reset View"
                            >
                                <RotateCcw size={16} />
                            </button>
                            <div className="w-px h-5 bg-white/20 mx-1" />
                        </>
                    )}
                    <button
                        onClick={handleDownload}
                        className="w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                        title="Download"
                    >
                        <ArrowDownToLine size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-red-500/80 flex items-center justify-center transition-colors cursor-pointer"
                        title="Close (Esc)"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Central Media Container (Enlarged) */}
            <div
                className="flex-1 w-full h-full flex items-center justify-center p-4 md:p-8 overflow-hidden"
                onClick={onClose}
            >
                <div
                    className="w-full h-full max-w-[96vw] max-h-[86vh] flex items-center justify-center overflow-auto custom-scrollbar transition-all duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {mediaType === "image" ? (
                        <img
                            src={mediaUrl}
                            alt={fileName}
                            className="transition-all duration-200 rounded-lg shadow-2xl object-contain max-w-full max-h-full"
                            style={{
                                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                                transformOrigin: "center center",
                                transition: zoomLevel === 1 ? "transform 0.2s ease-in-out" : "none",
                                width: "auto",
                                height: "auto"
                            }}
                            draggable={false}
                        />
                    ) : (
                        <video
                            src={mediaUrl}
                            controls
                            autoPlay
                            className="max-w-full max-h-full rounded-lg shadow-2xl bg-black"
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default MediaViewer;
