import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  RoomContext,
  RoomAudioRenderer,
  useTracks,
  useParticipants,
  VideoTrack,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MonitorOff,
  Loader2, Volume2, User, ArrowLeft, WifiOff, Shield, MessageSquare,
  Circle, Users, MoreHorizontal, Search, Send, X, Plus, Check
} from "lucide-react";
import useAuthStore from "../../store/authStore";
import { getLiveKitToken } from "../../services/livekitService";
import socketService from "../../services/socketService";
import useCallStore, { CALL_STATUS } from "../../store/callStore";
import useChatStore from "../../store/chatStore";
import userService from "../../services/userService";
import { ringtoneManager } from "../../utils/ringtoneManager";
import { toast } from "react-hot-toast";
import Avatar from "../../components/common/Avatar";

// ----------------------------------------------------------------
// Synchronized Call Timer
// ----------------------------------------------------------------
const CallTimer = ({ startTime }) => {
  const [time, setTime] = useState("00:00:00");

  useEffect(() => {
    if (!startTime) return;
    const updateTime = () => {
      const diff = Date.now() - startTime;
      if (diff < 0) { setTime("00:00:00"); return; }
      const totalSecs = Math.floor(diff / 1000);
      const hours = Math.floor(totalSecs / 3600);
      const minutes = Math.floor((totalSecs % 3600) / 60);
      const seconds = totalSecs % 60;
      const pad = (v) => String(v).padStart(2, "0");
      setTime(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <span className="text-xs font-mono text-emerald-400 bg-slate-900/80 px-3 py-1 rounded-full border border-emerald-500/20 backdrop-blur-md">
      {time}
    </span>
  );
};

// ----------------------------------------------------------------
// Participant Card
// ----------------------------------------------------------------
const ParticipantCard = ({ participant, track, isLocal }) => {
  const isSpeaking = participant.isSpeaking;
  const isVideoEnabled = participant.isCameraEnabled;
  const isAudioEnabled = participant.isMicrophoneEnabled;

  return (
    <div className={`relative w-full h-full rounded-2xl overflow-hidden bg-slate-900/40 backdrop-blur-md border-2 transition-all duration-300 ${isSpeaking ? "border-emerald-500 shadow-lg shadow-emerald-500/20 scale-[1.01]" : "border-slate-800/80"}`}>
      {isVideoEnabled && track && !track.placeholder ? (
        <VideoTrack trackRef={track} className="w-full h-full object-contain bg-slate-950" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/80 relative">
          <div className={`w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center relative ${isSpeaking ? "animate-pulse" : ""}`}>
            {isSpeaking && <span className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />}
            <User className="text-emerald-400" size={24} />
          </div>
          <span className="text-xs text-gray-300 mt-2.5 font-medium">
            {isLocal ? "You" : (participant.name || participant.identity)}
          </span>
        </div>
      )}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none bg-black/60 backdrop-blur-md rounded-lg px-2.5 py-1 z-10 border border-white/5">
        <span className="text-[11px] font-semibold truncate text-white">
          {isLocal ? "You" : (participant.name || participant.identity)}
        </span>
        <div className="flex items-center gap-1">
          {isAudioEnabled ? (
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400"><Mic size={10} /></div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center text-red-400"><MicOff size={10} /></div>
          )}
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------
// Call Layout — rendered inside LiveKitRoom context
// ----------------------------------------------------------------
const CallLayout = ({ type, recipientName, isGroup, onLeave, roomName }) => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const participants = useParticipants();
  const { isMuted, isCamOff, isScreenSharing, toggleMute, toggleCamera, toggleScreenShare, callState, callChatMessages, activeRoom } = useCallStore();
  const onlineUsers = useChatStore((s) => s.onlineUsers);

  const [activeSidebarTab, setActiveSidebarTab] = useState(null); // 'participants' | 'chat' | null
  const [usersList, setUsersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [invitedUsers, setInvitedUsers] = useState({}); // userId -> boolean
  const [chatInput, setChatInput] = useState("");
  
  const chatEndRef = useRef(null);

  // Screen recording state
  const [recordingState, setRecordingState] = useState({
    isRecording: false,
    time: 0,
    mediaRecorder: null,
    stream: null
  });
  const recordingTimerRef = useRef(null);
  const recordingStreamRef = useRef(null);
  const recordingMicStreamRef = useRef(null);
  const recordingAudioContextRef = useRef(null);

  const remoteParticipants = useMemo(() => {
    return participants.filter((p) => !p.isLocal && p.connectionStatus !== "disconnected");
  }, [participants]);

  const isConnected = isGroup ? participants.length > 0 : remoteParticipants.length > 0;

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: true }
  );

  const localCameraTrack = tracks.find((t) => t.participant.isLocal && t.source === Track.Source.Camera);
  const remoteCameraTrack = tracks.find((t) => !t.participant.isLocal && t.source === Track.Source.Camera);
  const remoteScreenShareTrack = tracks.find((t) => !t.participant.isLocal && t.source === Track.Source.ScreenShare);

  // Fetch users for invitation
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const users = await userService.fetchAllUsers();
        // Filter out current user and users already in the call room
        const currentParticipantIds = new Set(participants.map(p => p.identity));
        const otherUsers = users.filter(u => u._id !== user?._id && !currentParticipantIds.has(u._id));
        setUsersList(otherUsers);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    };
    if (activeSidebarTab === "participants") {
      fetchUsers();
    }
  }, [activeSidebarTab, participants, user?._id]);

  // Join temporary chat room on mount
  useEffect(() => {
    if (roomName) {
      socketService.emit("livekit-join-call-chat", { roomName });
    }
  }, [roomName]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [callChatMessages]);

  // Handle invitation
  const handleInvite = (targetUser) => {
    const callerName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "Someone";
    socketService.emit("livekit-invite-user", {
      to: targetUser._id,
      roomName,
      type: callState.type || type,
      callerName
    });

    setInvitedUsers(prev => ({ ...prev, [targetUser._id]: true }));
    toast.success(`Invitation sent to ${targetUser.firstName || targetUser.username}`);

    setTimeout(() => {
      setInvitedUsers(prev => ({ ...prev, [targetUser._id]: false }));
    }, 4000);
  };

  const sendMessage = useCallback((msgPayload) => {
    socketService.emit("livekit-call-chat-message", {
      roomName,
      message: msgPayload.message,
      senderName: msgPayload.senderName,
      id: msgPayload.id
    });

    const ackTimeout = setTimeout(() => {
      const msgs = useCallStore.getState().callChatMessages;
      const msgInStore = msgs.find(m => m.id === msgPayload.id);
      if (msgInStore && msgInStore.status === "sending") {
        useCallStore.getState().addCallChatMessage({
          id: msgPayload.id,
          status: "failed"
        });
      }
    }, 5000);

    if (!window._callChatAcks) window._callChatAcks = new Map();
    window._callChatAcks.set(msgPayload.id, ackTimeout);
  }, [roomName]);

  const handleRetryMessage = useCallback((msg) => {
    useCallStore.getState().addCallChatMessage({
      id: msg.id,
      status: "sending"
    });
    sendMessage({
      id: msg.id,
      message: msg.message,
      senderName: msg.senderName
    });
  }, [sendMessage]);

  // Send temporary chat message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const senderName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "Guest";
    const msgId = `${user._id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const msgPayload = {
      id: msgId,
      from: user._id,
      senderName,
      message: chatInput,
      timestamp: Date.now(),
      status: "sending"
    };

    // Add locally to store immediately (optimistic update)
    useCallStore.getState().addCallChatMessage(msgPayload);

    // Send it
    sendMessage(msgPayload);

    setChatInput("");
  };

  // Recording functionality
  const startRecording = async () => {
    try {
      toast.loading("Requesting screen capture permission...");
      
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: true
      });
      
      let combinedStream = displayStream;
      let audioContext = null;
      let micStream = null;
      
      try {
        let localMicTrack = null;
        
        // Try to reuse the existing LiveKit microphone track to avoid duplicate captures
        if (activeRoom && activeRoom.localParticipant) {
          const micPub = activeRoom.localParticipant.getTrackPublication(Track.Source.Microphone);
          if (micPub && micPub.track && micPub.track.mediaStreamTrack) {
            localMicTrack = micPub.track.mediaStreamTrack;
            console.log("[CallPage] Reusing active LiveKit microphone track for recording.");
          }
        }

        if (localMicTrack) {
          micStream = new MediaStream([localMicTrack]);
        } else {
          console.log("[CallPage] Creating new mic stream with constraints.");
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1
            }
          });
          recordingMicStreamRef.current = micStream;
        }
        
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        recordingAudioContextRef.current = audioContext;

        const dest = audioContext.createMediaStreamDestination();
        let hasAudioSource = false;
        
        if (displayStream.getAudioTracks().length > 0) {
          const displayAudioSource = audioContext.createMediaStreamSource(displayStream);
          displayAudioSource.connect(dest);
          hasAudioSource = true;
        }
        
        if (micStream.getAudioTracks().length > 0) {
          const micAudioSource = audioContext.createMediaStreamSource(micStream);
          micAudioSource.connect(dest);
          hasAudioSource = true;
        }
        
        if (hasAudioSource) {
          const tracks = [
            ...displayStream.getVideoTracks(),
            ...dest.stream.getAudioTracks()
          ];
          combinedStream = new MediaStream(tracks);
        }
      } catch (micErr) {
        console.warn("Recording mic failed, capturing tab audio only:", micErr);
      }
      
      const options = { mimeType: "video/webm;codecs=vp9,opus" };
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(combinedStream, options);
      } catch (e) {
        mediaRecorder = new MediaRecorder(combinedStream);
      }
      
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `NuraCall_Recording_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        combinedStream.getTracks().forEach(track => track.stop());
        displayStream.getTracks().forEach(track => track.stop());

        // Stop mic tracks only if they were newly captured (not reused LiveKit tracks)
        if (micStream && micStream !== activeRoom?.localParticipant?.getTrackPublication(Track.Source.Microphone)?.track?.mediaStreamTrack) {
          micStream.getTracks().forEach(track => track.stop());
        }
        
        if (audioContext && audioContext.state !== "closed") {
          audioContext.close().catch(() => {});
        }

        recordingMicStreamRef.current = null;
        recordingAudioContextRef.current = null;
        
        setRecordingState({
          isRecording: false,
          time: 0,
          mediaRecorder: null,
          stream: null
        });
        recordingStreamRef.current = null;
        toast.success("Call recording saved!");
      };
      
      mediaRecorder.start(1000);
      recordingStreamRef.current = combinedStream;
      
      setRecordingState({
        isRecording: true,
        time: 0,
        mediaRecorder,
        stream: combinedStream
      });
      
      toast.dismiss();
      toast.success("Recording started!");
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          time: prev.time + 1
        }));
      }, 1000);
      
    } catch (err) {
      toast.dismiss();
      console.error("Recording start failed:", err);
      toast.error("Recording permissions denied.");
    }
  };

  const stopRecording = () => {
    if (recordingState.mediaRecorder && recordingState.mediaRecorder.state !== "inactive") {
      recordingState.mediaRecorder.stop();
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  // Clean up recording stream on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (recordingMicStreamRef.current) {
        recordingMicStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (recordingAudioContextRef.current) {
        if (recordingAudioContextRef.current.state !== "closed") {
          recordingAudioContextRef.current.close().catch(() => {});
        }
      }
    };
  }, []);

  const formatRecordingTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const getGridClass = (count) => {
    if (count <= 1) return "grid-cols-1 max-w-3xl";
    if (count === 2) return "grid-cols-1 md:grid-cols-2 max-w-5xl";
    if (count <= 4) return "grid-cols-2 max-w-5xl";
    return "grid-cols-2 md:grid-cols-3 max-w-6xl";
  };

  const filteredUsers = usersList.filter(u =>
    `${u.firstName || ""} ${u.lastName || ""} ${u.username}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative w-full h-full flex bg-slate-950 text-white font-sans overflow-hidden">
      
      {/* Main Call Area */}
      <div className="flex-1 h-full flex flex-col justify-between relative overflow-hidden">
        
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 z-50 p-4 md:p-6 flex items-center justify-between bg-gradient-to-b from-black/90 to-transparent">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-800/60 hover:bg-slate-800 text-slate-200 flex items-center justify-center transition-all cursor-pointer shadow-md shadow-black/20"
              title="Minimize Call"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Volume2 className="text-emerald-400 animate-pulse" size={18} />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold font-display tracking-wide">{isGroup ? "Group Call" : recipientName}</h1>
              <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-400" : "bg-emerald-400 animate-pulse"}`} />
                {isConnected ? "Connected" : "Waiting for peers..."}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {recordingState.isRecording && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold animate-pulse mr-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>REC {formatRecordingTime(recordingState.time)}</span>
              </div>
            )}
            {isConnected && callState.startTime && (
              <CallTimer startTime={callState.startTime} />
            )}
            {!isConnected && !isGroup && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 backdrop-blur text-xs">
                <Loader2 className="animate-spin text-emerald-400" size={12} />
                <span>Waiting for answer</span>
              </div>
            )}
          </div>
        </div>

        {/* Video Grid Stage */}
        <div className="flex-1 w-full h-full flex items-center justify-center p-4 md:p-8 mt-16 mb-24 overflow-y-auto">
          {isGroup || participants.length > 2 ? (
            <div className="w-full h-full flex items-center justify-center">
              {remoteScreenShareTrack ? (
                <div className="w-full h-full flex flex-col md:flex-row gap-4">
                  <div className="flex-1 rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/40 relative aspect-video">
                    <VideoTrack trackRef={remoteScreenShareTrack} className="w-full h-full object-contain bg-slate-950" />
                    <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-lg text-xs font-semibold border border-white/5">
                      {remoteScreenShareTrack.participant.name || remoteScreenShareTrack.participant.identity}'s Screen
                    </div>
                  </div>
                  <div className="w-full md:w-80 shrink-0 flex flex-row md:flex-col gap-3 overflow-auto max-h-[200px] md:max-h-full custom-scrollbar">
                    {participants.map((p) => {
                      const cameraTrack = tracks.find((t) => t.participant.identity === p.identity && t.source === Track.Source.Camera);
                      return (
                        <div key={p.identity} className="w-48 md:w-full shrink-0">
                          <ParticipantCard participant={p} track={cameraTrack} isLocal={p.isLocal} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className={`grid gap-4 w-full h-full max-h-[70vh] justify-center items-center ${getGridClass(participants.length)}`}>
                  {participants.map((p) => {
                    const cameraTrack = tracks.find((t) => t.participant.identity === p.identity && t.source === Track.Source.Camera);
                    return <ParticipantCard key={p.identity} participant={p} track={cameraTrack} isLocal={p.isLocal} />;
                  })}
                </div>
              )}
            </div>
          ) : type === "video" ? (
            <div className="relative w-full h-full max-h-[70vh] flex items-center justify-center bg-slate-900/10 rounded-2xl overflow-hidden">
              {remoteScreenShareTrack ? (
                <VideoTrack trackRef={remoteScreenShareTrack} className="w-full h-full object-contain bg-slate-950" />
              ) : remoteCameraTrack && !remoteCameraTrack.placeholder ? (
                <VideoTrack trackRef={remoteCameraTrack} className="w-full h-full object-contain bg-slate-950" />
              ) : (
                <div className="flex flex-col items-center justify-center animate-fade-in">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 relative">
                    <span className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping opacity-75" />
                    <User size={48} className="text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-wide">{recipientName}</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {isConnected ? "Camera is off" : "Connecting..."}
                  </p>
                </div>
              )}
              {!isCamOff && localCameraTrack && (
                <div className="absolute bottom-4 right-4 w-28 h-40 md:w-36 md:h-48 rounded-2xl border-2 border-slate-700/80 shadow-2xl overflow-hidden z-40 bg-slate-950 transition-all duration-300">
                  <VideoTrack trackRef={localCameraTrack} className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          ) : (
            /* Audio call layout */
            <div className="flex flex-col items-center justify-center text-center px-4">
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 shadow-2xl relative">
                <span className="absolute inset-0 rounded-full bg-emerald-500/5 animate-ping opacity-60" style={{ animationDuration: "2s" }} />
                <span className="absolute inset-2 rounded-full bg-emerald-500/10 animate-ping opacity-75" style={{ animationDuration: "3s" }} />
                <User size={56} className="text-emerald-400" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-wide font-display">{recipientName}</h2>
              <p className="text-sm text-emerald-400 font-medium mt-2">
                {isConnected ? "Voice Call Active" : "Connecting..."}
              </p>
            </div>
          )}
        </div>

        {/* Floating Bottom Control Bar */}
        <div className="absolute bottom-0 left-0 right-0 z-50 p-6 flex flex-col items-center bg-gradient-to-t from-black/95 to-transparent">
          <div className="flex items-center gap-3 px-6 py-3.5 rounded-3xl bg-slate-900/80 border border-slate-800/60 backdrop-blur-xl shadow-2xl animate-scale-in max-w-full overflow-x-auto">
            
            {/* Mic Control */}
            <button
              onClick={toggleMute}
              className={`flex flex-col items-center gap-1 px-2.5 py-1.5 transition-all cursor-pointer ${isMuted ? "text-red-400 hover:text-red-300" : "text-slate-400 hover:text-white"}`}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              <span className="text-[10px] font-medium tracking-wide">{isMuted ? "Unmute" : "Mute"}</span>
            </button>

            {/* Camera Control */}
            {(type === "video" || isGroup) && (
              <button
                onClick={toggleCamera}
                className={`flex flex-col items-center gap-1 px-2.5 py-1.5 transition-all cursor-pointer ${isCamOff ? "text-red-400 hover:text-red-300" : "text-slate-400 hover:text-white"}`}
                title={isCamOff ? "Turn Camera On" : "Turn Camera Off"}
              >
                {isCamOff ? <VideoOff size={20} /> : <Video size={20} />}
                <span className="text-[10px] font-medium tracking-wide">{isCamOff ? "Start Video" : "Stop Video"}</span>
              </button>
            )}

            {/* Share Screen Control */}
            {(type === "video" || isGroup) && (
              <button
                onClick={toggleScreenShare}
                className={`flex flex-col items-center gap-1 px-2.5 py-1.5 transition-all cursor-pointer ${isScreenSharing ? "text-emerald-400 hover:text-emerald-300" : "text-slate-400 hover:text-white"}`}
                title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
              >
                {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
                <span className="text-[10px] font-medium tracking-wide">Share Screen</span>
              </button>
            )}

            {/* Chat Sidebar Control */}
            <button
              onClick={() => setActiveSidebarTab(activeSidebarTab === "chat" ? null : "chat")}
              className={`flex flex-col items-center gap-1 px-2.5 py-1.5 transition-all cursor-pointer ${activeSidebarTab === "chat" ? "text-emerald-400" : "text-slate-400 hover:text-white"}`}
              title="Toggle Chat"
            >
              <MessageSquare size={20} />
              <span className="text-[10px] font-medium tracking-wide">Chat</span>
            </button>

            {/* Participants Sidebar Control */}
            <button
              onClick={() => setActiveSidebarTab(activeSidebarTab === "participants" ? null : "participants")}
              className={`flex flex-col items-center gap-1 px-2.5 py-1.5 transition-all cursor-pointer ${activeSidebarTab === "participants" ? "text-emerald-400" : "text-slate-400 hover:text-white"}`}
              title="Toggle Participants"
            >
              <Users size={20} />
              <span className="text-[10px] font-medium tracking-wide">Participants</span>
            </button>

            <div className="w-px h-8 bg-slate-800 mx-1.5" />
            
            {/* End Call Button */}
            <button
              onClick={onLeave}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-red-600 border border-red-500 text-white hover:bg-red-500 transition-all duration-200 transform hover:scale-105 cursor-pointer shadow-lg shadow-red-950/40 shrink-0"
              title="Hang Up Call"
            >
              <PhoneOff size={20} />
            </button>

          </div>
        </div>

      </div>

      {/* Right Sidebar (Chat & Participants & Invites) */}
      {activeSidebarTab && (
        <div className="absolute inset-0 md:relative md:inset-auto md:w-96 shrink-0 h-full border-l border-slate-800 bg-slate-950 md:bg-slate-900/60 backdrop-blur-2xl flex flex-col z-[100] md:z-50 animate-slide-in-right">
          
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveSidebarTab("participants")}
                className={`text-sm font-semibold pb-1 border-b-2 transition-all cursor-pointer ${activeSidebarTab === "participants" ? "border-emerald-500 text-white" : "border-transparent text-slate-400"}`}
              >
                Participants
              </button>
              <button
                onClick={() => setActiveSidebarTab("chat")}
                className={`text-sm font-semibold pb-1 border-b-2 transition-all cursor-pointer ${activeSidebarTab === "chat" ? "border-emerald-500 text-white" : "border-transparent text-slate-400"}`}
              >
                Chat Room
              </button>
            </div>
            <button
              onClick={() => setActiveSidebarTab(null)}
              className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeSidebarTab === "participants" ? (
              <div className="flex-1 overflow-y-auto flex flex-col p-4 custom-scrollbar">
                
                {/* Current Active Participants List */}
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Active Callers ({participants.length})</h3>
                <div className="flex flex-col gap-2 mb-6">
                  {participants.map(p => (
                    <div key={p.identity} className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-800">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                          {p.name ? p.name.charAt(0).toUpperCase() : p.identity.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium truncate text-slate-200">
                          {p.isLocal ? `${p.name || p.identity} (You)` : (p.name || p.identity)}
                        </span>
                      </div>
                      <div className="flex gap-1.5 text-slate-400 shrink-0">
                        {p.isMicrophoneEnabled ? <Mic size={14} className="text-emerald-400" /> : <MicOff size={14} className="text-red-400" />}
                        {p.isCameraEnabled ? <Video size={14} className="text-emerald-400" /> : <VideoOff size={14} className="text-red-400" />}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Invite Members Interface */}
                <div className="mt-2 border-t border-slate-800 pt-4 flex-1 flex flex-col min-h-[300px]">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Invite new participants</h3>
                  
                  {/* User Search Input */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 text-slate-200"
                    />
                  </div>

                  {/* Search results */}
                  <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 custom-scrollbar">
                    {!searchQuery.trim() ? (
                      <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                        <Search size={24} className="opacity-40 mb-2" />
                        <p className="text-xs">Search for users to invite them</p>
                      </div>
                    ) : filteredUsers.length > 0 ? (
                      filteredUsers.map(u => {
                        const name = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username;
                        const isInvited = invitedUsers[u._id];
                        const isOnline = onlineUsers && onlineUsers.has(u._id);
                        return (
                          <div key={u._id} className="flex items-center justify-between p-2 rounded-xl bg-slate-850 hover:bg-slate-800/40 border border-slate-800/40 transition-colors">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar
                                src={u.profileImage}
                                name={name}
                                isOnline={isOnline}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <h4 className="text-sm font-medium truncate text-slate-200">{name}</h4>
                                <span className={`text-[10px] flex items-center gap-1 ${isOnline ? "text-emerald-400" : "text-slate-500"}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-400" : "bg-slate-500"}`} /> 
                                  {isOnline ? "Online (Available)" : "Offline (Unavailable)"}
                                </span>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => isOnline && handleInvite(u)}
                              disabled={isInvited || !isOnline}
                              className={`h-7 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                                isInvited 
                                  ? "bg-emerald-600/20 border border-emerald-500/40 text-emerald-400" 
                                  : !isOnline
                                    ? "bg-slate-800 border border-slate-700/50 text-slate-500 cursor-not-allowed"
                                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/20"
                              }`}
                            >
                              {isInvited ? (
                                <>
                                  <Check size={12} />
                                  <span>Sent</span>
                                </>
                              ) : !isOnline ? (
                                <span>Offline</span>
                              ) : (
                                <>
                                  <Plus size={12} />
                                  <span>Invite</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-500 text-center py-6">No users found to invite</p>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              /* Chat Tab Content */
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 custom-scrollbar">
                  {callChatMessages.length > 0 ? (
                    callChatMessages.map((msg, i) => {
                      const isMe = msg.from === user?._id;
                      return (
                        <div key={msg.id || i} className={`flex flex-col max-w-[85%] ${isMe ? "self-end items-end" : "self-start items-start"}`}>
                          <span className="text-[10px] font-semibold text-slate-400 px-1 mb-0.5">
                            {msg.senderName}
                            {isMe && msg.status === "sending" && <span className="text-slate-500 ml-1.5 text-[9px] italic">(sending...)</span>}
                            {isMe && msg.status === "failed" && (
                              <span
                                className="text-red-400 ml-1.5 text-[9px] italic cursor-pointer hover:underline"
                                onClick={() => handleRetryMessage(msg)}
                                title="Click to retry sending"
                              >
                                (failed - retry?)
                              </span>
                            )}
                          </span>
                          <div className={`p-3 rounded-2xl text-sm ${isMe ? "bg-emerald-600 text-white rounded-br-none shadow-md shadow-emerald-950/10" : "bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700/60"}`}>
                            {msg.message}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                      <MessageSquare size={32} className="opacity-40 mb-2" />
                      <p className="text-xs font-medium">Temporary Call Chat</p>
                      <p className="text-[10px] text-slate-600 mt-1 max-w-[200px]">Messages sent here are real-time and vanish after the call ends.</p>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Message Input */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-950/40 flex gap-2 items-center">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500/50 text-slate-200"
                  />
                  <button
                    type="submit"
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/20 cursor-pointer shrink-0 transition-colors"
                  >
                    <Send size={15} />
                  </button>
                </form>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

// ================================================================
// Call Page — Main Entry Point
// ================================================================
const CallPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const roomName = searchParams.get("room");
  const type = searchParams.get("type") || "video";
  const recipientName = searchParams.get("recipientName") || "User";
  const recipientId = searchParams.get("recipientId");
  const isIncoming = searchParams.get("incoming") === "true";
  const isGroup = searchParams.get("isGroup") === "true";

  const [loading, setLoading] = useState(false);
  const [connectError, setConnectError] = useState(null);

  // initFiredRef: ensures initCall fires exactly once per mount
  const initFiredRef = useRef(false);
  // isMountedRef: prevents state updates after unmount
  const isMountedRef = useRef(true);

  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL;
  const { callState, activeRoom, initCallRoom, resetCallState, setCallState } = useCallStore();

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // handleCleanExit: properly ends call and navigates home
  const handleCleanExit = useCallback(() => {
    ringtoneManager.stopAll();
    if (isGroup) {
      socketService.emit("livekit-group-call-leave", { roomName });
    } else if (recipientId) {
      socketService.emit("livekit-call-ended", { to: recipientId, roomName });
    }
    resetCallState();
    navigate("/");
  }, [isGroup, roomName, recipientId, resetCallState, navigate]);

  // initCall: fetches token and connects to LiveKit room
  const initCall = useCallback(async (startTimeVal) => {
    const store = useCallStore.getState();
    console.log("[CallPage] initCall invoked. roomName:", roomName, "startTimeVal:", startTimeVal, "isConnecting:", store.isConnecting, "hasActiveRoom:", !!store.activeRoom);

    // Guard: only fire once
    if (initFiredRef.current) {
      console.log("[CallPage] initCall already fired, skipping duplicate.");
      return;
    }
    if (store.activeRoom && store.callState.roomName === roomName) {
      console.log("[CallPage] Already connected to this room, skipping.");
      return;
    }
    if (store.isConnecting) {
      console.log("[CallPage] Connection already in progress, skipping.");
      return;
    }

    initFiredRef.current = true;
    if (isMountedRef.current) setLoading(true);
    if (isMountedRef.current) setConnectError(null);

    const toastId = toast.loading("Connecting to call...");

    try {
      console.log("[CallPage] Fetching LiveKit token for room:", roomName);
      const data = await getLiveKitToken(roomName);
      console.log("[CallPage] Token fetched. Identity:", data.identity);

      // Guard: call may have been aborted during async token fetch
      const currentState = useCallStore.getState().callState;
      if (currentState.status === CALL_STATUS.IDLE || currentState.status === CALL_STATUS.ENDED) {
        console.log("[CallPage] Call aborted during token fetch. Aborting room connection.");
        toast.dismiss(toastId);
        initFiredRef.current = false;
        if (isMountedRef.current) setLoading(false);
        return;
      }

      // Validate LiveKit URL
      if (!livekitUrl) {
        throw new Error("VITE_LIVEKIT_URL is not configured. Add it to frontend/.env");
      }

      toast.loading("Establishing media connection...", { id: toastId });

      const latestStartTime = useCallStore.getState().callState.startTime || startTimeVal || Date.now();

      await initCallRoom(
        roomName,
        data.token,
        livekitUrl,
        type,
        recipientId,
        recipientName,
        isGroup,
        latestStartTime
      );

      console.log("[CallPage] LiveKit room connected successfully.");
      toast.success("Call connected!", { id: toastId });

    } catch (err) {
      console.error("[CallPage] initCall failed:", err);

      const errorMsg = err.response?.data?.message || err.message || "Connection failed";
      toast.error(`Call failed: ${errorMsg}`, { id: toastId, duration: 6000 });

      if (isMountedRef.current) {
        setConnectError(errorMsg);
        setLoading(false);
      }

      initFiredRef.current = false;
      resetCallState();

      if (isMountedRef.current) {
        navigate("/");
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [roomName, livekitUrl, type, recipientId, recipientName, isGroup, initCallRoom, resetCallState, navigate]);

  // ----------------------------------------------------------------
  // PRIMARY MOUNT EFFECT — determines which call path to take
  // ----------------------------------------------------------------
  useEffect(() => {
    // Cancel any pending Strict Mode timeout
    if (window._callCancelTimeout) {
      clearTimeout(window._callCancelTimeout);
      window._callCancelTimeout = null;
    }

    if (!user) { navigate("/login"); return; }
    if (!roomName) { toast.error("Invalid call credentials"); navigate("/"); return; }

    // Path A: Returning to an already connected call (minimize → banner click)
    if (activeRoom && callState.roomName === roomName) {
      console.log("[CallPage] Path A: Reattaching to existing active room.");
      return;
    }

    // Path B: Outgoing 1-to-1 call — show dialing UI, emit socket signal
    if (!isIncoming && !isGroup) {
      if (
        callState.status === CALL_STATUS.ACCEPTED ||
        callState.status === CALL_STATUS.CONNECTING ||
        callState.status === CALL_STATUS.CONNECTED
      ) {
        console.log("[CallPage] Path B→skip: caller navigating after acceptance. Second effect will handle room connection.");
        return;
      }

      if (
        (callState.status === CALL_STATUS.OUTGOING_CALL || callState.status === CALL_STATUS.RINGING) &&
        callState.roomName === roomName
      ) {
        console.log("[CallPage] Path B: Outgoing call already initiated. Skipping duplicate emission.");
        return;
      }

      console.log("[CallPage] Path B: Initiating outgoing call to", recipientId);
      setCallState({
        status: CALL_STATUS.OUTGOING_CALL,
        role: "caller",
        roomName,
        type,
        peerId: recipientId,
        peerName: recipientName,
        isGroup: false,
      });
      ringtoneManager.startOutgoing();
      socketService.emit("livekit-call-user", {
        to: recipientId,
        roomName,
        type,
        callerName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username,
        recipientName: recipientName,
      });
      return;
    }

    // Path C: Incoming 1-to-1 — receiver accepted, navigated here
    if (isIncoming && !isGroup) {
      console.log("[CallPage] Path C: Incoming call. status:", callState.status);
      if (
        callState.status !== CALL_STATUS.ACCEPTED &&
        callState.status !== CALL_STATUS.CONNECTING &&
        callState.status !== CALL_STATUS.CONNECTED &&
        callState.status !== CALL_STATUS.INCOMING_CALL
      ) {
        console.warn("[CallPage] Path C: unexpected callState.status:", callState.status, "— aborting.");
        navigate("/");
        return;
      }
      const startTime = callState.startTime || Date.now();
      initCall(startTime);
      return;
    }

    // Path D: Group call (both initiator and joiner)
    if (isGroup) {
      console.log("[CallPage] Path D: Group call. status:", callState.status);
      if (callState.status !== CALL_STATUS.ACCEPTED && callState.status !== CALL_STATUS.CONNECTED) {
        setCallState({
          status: CALL_STATUS.ACCEPTED,
          role: "group",
          roomName,
          type,
          peerId: recipientId,
          peerName: recipientName,
          isGroup: true,
          startTime: Date.now(),
        });
      }
      initCall(callState.startTime || Date.now());
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, roomName]);

  // ----------------------------------------------------------------
  // CALLER ACCEPTANCE EFFECT
  // ----------------------------------------------------------------
  useEffect(() => {
    if (
      !isIncoming &&
      !isGroup &&
      (callState.status === CALL_STATUS.ACCEPTED || callState.status === CALL_STATUS.CONNECTING) &&
      callState.startTime &&
      !initFiredRef.current &&
      !activeRoom &&
      !useCallStore.getState().isConnecting
    ) {
      console.log("[CallPage] Caller acceptance effect: initiating LiveKit room connection.");
      initCall(callState.startTime);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState.status, callState.startTime, isIncoming, isGroup]);

  // ----------------------------------------------------------------
  // ENDED STATE AUTO-NAVIGATE
  // ----------------------------------------------------------------
  useEffect(() => {
    if (callState.status === CALL_STATUS.ENDED) {
      console.log("[CallPage] ENDED status detected — cleaning up and navigating home.");
      const t = setTimeout(() => {
        ringtoneManager.stopAll();
        navigate("/");
      }, 400);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState.status]);

  // ----------------------------------------------------------------
  // CLEANUP ON UNMOUNT
  // ----------------------------------------------------------------
  useEffect(() => {
    return () => {
      ringtoneManager.stopAll();
      const store = useCallStore.getState();
      const state = store.callState;

      // Stop all local tracks to release camera/microphone hardware
      if (store.activeRoom && store.activeRoom.localParticipant) {
        store.activeRoom.localParticipant.trackPublications.forEach((pub) => {
          if (pub.track) {
            try {
              pub.track.stop();
            } catch (e) {
              console.warn("[CallPage] Error stopping track:", e);
            }
          }
        });
      }

      if (state.status === CALL_STATUS.OUTGOING_CALL || state.status === CALL_STATUS.RINGING) {
        const timeoutId = setTimeout(() => {
          const freshState = useCallStore.getState().callState;
          if (freshState.status === CALL_STATUS.OUTGOING_CALL || freshState.status === CALL_STATUS.RINGING) {
            console.log("[CallPage] Unmounting during outgoing ring — cancelling call.");
            if (!isGroup && recipientId) {
              socketService.emit("livekit-call-ended", { to: recipientId, roomName });
            } else if (isGroup) {
              socketService.emit("livekit-group-call-leave", { roomName });
            }
            useCallStore.getState().resetCallState();
          }
          window._callCancelTimeout = null;
        }, 150);
        window._callCancelTimeout = timeoutId;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, recipientId, isGroup]);

  // ----------------------------------------------------------------
  // RENDER STATES
  // ----------------------------------------------------------------

  if (loading) {
    return (
      <div className="w-screen h-[100dvh] flex flex-col items-center justify-center bg-slate-950 text-white gap-4 font-sans">
        <div className="relative">
          <Loader2 className="animate-spin text-emerald-400" size={40} />
          <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
        </div>
        <h2 className="text-lg font-semibold tracking-wide">Connecting to call...</h2>
        <p className="text-sm text-gray-500">Establishing secure media channel</p>
      </div>
    );
  }

  if (connectError) {
    return (
      <div className="w-screen h-[100dvh] flex flex-col items-center justify-center bg-slate-950 text-white gap-4 font-sans p-8 text-center">
        <WifiOff className="text-red-400" size={40} />
        <h2 className="text-lg font-semibold">Connection Failed</h2>
        <p className="text-sm text-gray-400 max-w-sm">{connectError}</p>
        <button
          onClick={() => { setConnectError(null); initFiredRef.current = false; initCall(callState.startTime || Date.now()); }}
          className="mt-4 px-6 py-2 bg-emerald-650 hover:bg-emerald-600 rounded-xl text-white font-medium transition-colors"
        >
          Retry
        </button>
        <button onClick={() => { resetCallState(); navigate("/"); }} className="text-sm text-gray-500 hover:text-gray-400 underline mt-2">
          Go Home
        </button>
      </div>
    );
  }

  // Outgoing dialing screen
  if (!activeRoom && (callState.status === CALL_STATUS.OUTGOING_CALL || callState.status === CALL_STATUS.RINGING)) {
    return (
      <div className="relative w-screen h-[100dvh] flex flex-col justify-between bg-slate-950 text-white font-sans overflow-hidden">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="p-6 flex items-center gap-3.5 z-10">
          <button
            onClick={handleCleanExit}
            className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:bg-slate-800 text-slate-200 flex items-center justify-center transition-all cursor-pointer"
            title="Cancel Call & Go Back"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold font-display tracking-wide">NuraChat Call</h1>
        </div>

        <div className="flex flex-col items-center justify-center text-center px-4 z-10">
          <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6 shadow-2xl relative">
            <span className="absolute inset-0 rounded-full bg-emerald-500/5 animate-ping opacity-60" style={{ animationDuration: "2s" }} />
            <span className="absolute inset-2 rounded-full bg-emerald-500/10 animate-ping opacity-75" style={{ animationDuration: "3s" }} />
            <User size={56} className="text-emerald-400" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-wide font-display">{recipientName}</h2>
          <p className="text-sm text-emerald-400 font-medium mt-2 animate-pulse capitalize">Calling ({type})...</p>
        </div>

        <div className="p-8 flex justify-center mb-6 z-10">
          <button
            onClick={handleCleanExit}
            className="w-14 h-14 flex items-center justify-center rounded-full bg-red-600 border border-red-500 text-white hover:bg-red-500 transition-all duration-200 transform hover:scale-105 cursor-pointer shadow-lg shadow-red-950/40"
            title="Cancel Call"
          >
            <PhoneOff size={22} />
          </button>
        </div>
      </div>
    );
  }

  // Connecting spinner
  if (!activeRoom) {
    return (
      <div className="w-screen h-[100dvh] flex flex-col items-center justify-center bg-slate-950 text-white gap-4 font-sans">
        <div className="relative">
          <Loader2 className="animate-spin text-emerald-400" size={40} />
          <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
        </div>
        <h2 className="text-lg font-semibold tracking-wide">Joining room...</h2>
        <p className="text-sm text-gray-500">This may take a moment</p>
        <button
          onClick={handleCleanExit}
          className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors text-sm"
        >
          <PhoneOff size={14} /> Cancel
        </button>
      </div>
    );
  }

  // Active call room
  return (
    <div className="w-screen h-[100dvh]">
      <RoomContext.Provider value={activeRoom}>
        <CallLayout
          type={type}
          recipientName={recipientName}
          recipientId={recipientId}
          roomName={roomName}
          isGroup={isGroup}
          onLeave={handleCleanExit}
        />
        <RoomAudioRenderer />
      </RoomContext.Provider>
    </div>
  );
};

export default CallPage;
