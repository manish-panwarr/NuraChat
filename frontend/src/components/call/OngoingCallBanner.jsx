import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mic, MicOff, Video, VideoOff, PhoneOff, ExternalLink } from "lucide-react";
import useCallStore, { CALL_STATUS } from "../../store/callStore";
import socketService from "../../services/socketService";

const OngoingCallBanner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { callState, isMuted, isCamOff, activeRoom, toggleMute, toggleCamera, resetCallState } = useCallStore();
  const [durationText, setDurationText] = useState("00:00:00");

  const isCallActive = callState.status === CALL_STATUS.CONNECTED || callState.status === CALL_STATUS.RECONNECTING;
  const isOnCallPage = location.pathname === "/call";
  const mediaControlsEnabled = !!activeRoom;

  useEffect(() => {
    if (!isCallActive || !callState.startTime) return;

    const updateTimer = () => {
      const ms = Date.now() - callState.startTime;
      if (ms < 0) {
        setDurationText("00:00:00");
        return;
      }
      const totalSecs = Math.floor(ms / 1000);
      const hours = Math.floor(totalSecs / 3600);
      const minutes = Math.floor((totalSecs % 3600) / 60);
      const seconds = totalSecs % 60;

      const pad = (val) => String(val).padStart(2, "0");
      setDurationText(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isCallActive, callState.startTime]);

  if (!isCallActive || isOnCallPage) return null;

  const handleBannerClick = () => {
    const { roomName, type, peerId, peerName, isGroup } = callState;
    navigate(
      `/call?room=${roomName}&type=${type}&recipientName=${encodeURIComponent(
        peerName
      )}&recipientId=${peerId}&incoming=true${isGroup ? "&isGroup=true" : ""}`
    );
  };

  const handleHangup = (e) => {
    e.stopPropagation();
    const { roomName, peerId, isGroup } = callState;
    if (isGroup) {
      socketService.emit("livekit-group-call-leave", { roomName });
    } else if (peerId) {
      socketService.emit("livekit-call-ended", { to: peerId, roomName });
    }
    resetCallState();
  };

  return (
    <div
      onClick={handleBannerClick}
      className="fixed bottom-6 right-6 z-[9990] flex items-center justify-between gap-4 p-4 rounded-2xl glass-effect border border-slate-200/50 dark:border-slate-800/80 shadow-2xl hover:shadow-teal-500/10 dark:hover:shadow-teal-400/5 cursor-pointer transform hover:-translate-y-1 transition-all duration-300 animate-slide-in-right max-w-sm w-80 md:w-96 select-none bg-white/90 dark:bg-slate-950/80"
    >
      {/* Participant / Group details */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-[13px] font-bold text-gray-800 dark:text-gray-100 truncate">
            {callState.peerName}
          </h4>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold tracking-wider uppercase">
              {callState.type} Call
            </span>
            <span className="text-gray-300 dark:text-gray-700 text-xs">•</span>
            <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
              {durationText}
            </span>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* Toggle Microphone */}
        <button
          onClick={mediaControlsEnabled ? toggleMute : undefined}
          disabled={!mediaControlsEnabled}
          className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all duration-200 ${!mediaControlsEnabled
            ? "bg-slate-100 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50"
            : isMuted
              ? "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20 cursor-pointer"
              : "bg-slate-50 dark:bg-slate-900 border-gray-100 dark:border-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
            }`}
          title={!mediaControlsEnabled ? "Connecting..." : isMuted ? "Unmute Microphone" : "Mute Microphone"}
        >
          {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
        </button>

        {/* Toggle Camera  */}
        {callState.type === "video" && (
          <button
            onClick={mediaControlsEnabled ? toggleCamera : undefined}
            disabled={!mediaControlsEnabled}
            className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all duration-200 ${!mediaControlsEnabled
              ? "bg-slate-100 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50"
              : isCamOff
                ? "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20 cursor-pointer"
                : "bg-slate-50 dark:bg-slate-900 border-gray-100 dark:border-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
              }`}
            title={!mediaControlsEnabled ? "Connecting..." : isCamOff ? "Turn Camera On" : "Turn Camera Off"}
          >
            {isCamOff ? <VideoOff size={15} /> : <Video size={15} />}
          </button>
        )}

        {/* Red Hangup Button */}
        <button
          onClick={handleHangup}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all duration-200 cursor-pointer border-none shadow-md shadow-red-500/20"
          title="Hang Up Call"
        >
          <PhoneOff size={15} />
        </button>
      </div>
    </div>
  );
};

export default OngoingCallBanner;
