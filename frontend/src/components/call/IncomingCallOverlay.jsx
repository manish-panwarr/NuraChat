import React from "react";
import { useNavigate } from "react-router-dom";
import { Phone, PhoneOff, Video, Volume2, User } from "lucide-react";
import socketService from "../../services/socketService";
import useCallStore, { CALL_STATUS } from "../../store/callStore";
import { ringtoneManager } from "../../utils/ringtoneManager";

const IncomingCallOverlay = () => {
  const { callState, resetCallState } = useCallStore();
  const navigate = useNavigate();

  const handleAccept = () => {
    const state = useCallStore.getState();
    const activeCallState = state.callState;

    if (!activeCallState || activeCallState.status !== CALL_STATUS.INCOMING_CALL) return;

    ringtoneManager.stopIncoming();
    state.setCallState({ status: CALL_STATUS.ACCEPTED });

    if (activeCallState.isGroup) {
      socketService.emit("livekit-group-call-join", {
        roomName: activeCallState.roomName,
      });
    } else {
      socketService.emit("livekit-call-accepted", {
        to: activeCallState.peerId,
        roomName: activeCallState.roomName,
      });
    }

    state.setCallState({ status: CALL_STATUS.CONNECTING });
    navigate(
      `/call?room=${activeCallState.roomName}&type=${activeCallState.type}&recipientName=${encodeURIComponent(
        activeCallState.peerName
      )}&recipientId=${activeCallState.peerId}&incoming=true${activeCallState.isGroup ? "&isGroup=true" : ""}`
    );
  };

  const handleDecline = () => {
    if (!callState || callState.status !== CALL_STATUS.INCOMING_CALL) return;

    ringtoneManager.stopIncoming();

    if (!callState.isGroup) {
      socketService.emit("livekit-call-declined", {
        to: callState.peerId,
      });
    }

    resetCallState();
  };

  if (!callState || callState.status !== CALL_STATUS.INCOMING_CALL) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-sm overflow-hidden border border-gray-100/10 rounded-3xl bg-slate-900/90 text-white shadow-2xl backdrop-blur-xl animate-scale-in p-6">


        <div className="absolute -top-12 -left-12 w-28 h-28 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />


        <div className="flex flex-col items-center text-center mt-4">
          <div className="w-20 h-20 rounded-full bg-teal-500/10 border-2 border-teal-500/30 flex items-center justify-center mb-4 relative">
            <span className="absolute inset-0 rounded-full bg-teal-500/10 animate-ping opacity-75" style={{ animationDuration: "2s" }} />
            <User size={36} className="text-teal-400" />
          </div>

          <h3 className="text-lg font-bold font-display tracking-wide">{callState.peerName}</h3>

          <div className="flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs">
            <Volume2 size={12} className="text-teal-400 animate-pulse" />
            <span className="text-gray-400 capitalize font-medium">{callState.type} Call Incoming</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-around gap-6 mt-8 mb-4">

          {/* Decline Button */}
          <button
            onClick={handleDecline}
            className="flex flex-col items-center gap-2 cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-full bg-red-600 border border-red-500 flex items-center justify-center text-white transition-transform group-hover:scale-110 shadow-lg shadow-red-950/40">
              <PhoneOff size={22} />
            </div>
            <span className="text-xs text-red-400 font-medium tracking-wider group-hover:text-red-300">Decline</span>
          </button>

          {/* Accept Button */}
          <button
            onClick={handleAccept}
            className="flex flex-col items-center gap-2 cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-600 border border-emerald-500 flex items-center justify-center text-white transition-transform group-hover:scale-110 shadow-lg shadow-emerald-950/40">
              {callState.type === "video" ? <Video size={22} /> : <Phone size={22} />}
            </div>
            <span className="text-xs text-emerald-400 font-medium tracking-wider group-hover:text-emerald-300">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallOverlay;
