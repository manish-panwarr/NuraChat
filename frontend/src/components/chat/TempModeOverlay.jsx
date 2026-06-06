import React from "react";
import { Zap, ShieldAlert, Check, X } from "lucide-react";
import useChatStore from "../../store/chatStore";
import socketService from "../../services/socketService";
import { toast } from "react-hot-toast";

const TempModeOverlay = () => {
  const tempModeRequest = useChatStore((s) => s.tempModeRequest);
  const setTempModeRequest = useChatStore((s) => s.setTempModeRequest);
  const setChatMode = useChatStore((s) => s.setChatMode);

  if (!tempModeRequest || !tempModeRequest.isActive) return null;

  const handleAccept = () => {
    setChatMode("temp");
    socketService.emit("temp-mode-accepted", {
      to: tempModeRequest.fromUserId,
    });

    setTempModeRequest(null);
    toast.success("Temporary P2P mode activated!", { icon: "" });
  };

  const handleDecline = () => {
    socketService.emit("temp-mode-declined", {
      to: tempModeRequest.fromUserId,
    });

    setTempModeRequest(null);
    toast("Temporary mode request declined", { icon: "✕" });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-sm overflow-hidden border border-gray-100/10 rounded-3xl bg-slate-900/90 text-white shadow-2xl backdrop-blur-xl animate-scale-in p-6">

        <div className="absolute -top-12 -left-12 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-28 h-28 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header/Icon */}
        <div className="flex flex-col items-center text-center mt-4">
          <div className="w-18 h-18 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 relative">
            <span className="absolute inset-0 rounded-2xl bg-amber-500/5 animate-ping opacity-60" style={{ animationDuration: "2s" }} />
            <Zap size={30} className="text-amber-400 fill-amber-400/25 animate-pulse" />
          </div>

          <h3 className="text-lg font-bold font-display tracking-wide">Temporary Chat Mode</h3>

          <div className="flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs">
            <ShieldAlert size={12} className="text-amber-400" />
            <span className="text-gray-300 font-medium">Invited by {tempModeRequest.fromUserName || "Partner"}</span>
          </div>
        </div>

        <p className="mt-4 text-[13px] text-gray-300 text-center leading-relaxed">
          Switching to <strong>Temp Mode (P2P)</strong> means your messages will be relayed directly and <strong>won't be stored in the database</strong>. They'll disappear when you leave this chat.
        </p>

        <div className="flex items-center justify-around gap-4 mt-6 mb-2">

          {/* Decline Button */}
          <button
            onClick={handleDecline}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all font-semibold text-[13px] cursor-pointer"
          >
            <X size={15} />
            <span>Decline</span>
          </button>

          {/* Accept Button */}
          <button
            onClick={handleAccept}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border border-emerald-500/30 bg-emerald-600/90 text-white hover:bg-emerald-500 transition-all font-semibold text-[13px] cursor-pointer shadow-lg shadow-emerald-950/20"
          >
            <Check size={15} />
            <span>Accept</span>
          </button>

        </div>
      </div>
    </div>
  );
};

export default TempModeOverlay;
