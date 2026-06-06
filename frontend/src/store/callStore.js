import { create } from "zustand";
import { Room, RoomEvent, ConnectionState, Track, createLocalAudioTrack, createLocalVideoTrack } from "livekit-client";
import { toast } from "react-hot-toast";

export const CALL_STATUS = Object.freeze({
  IDLE: "idle",
  OUTGOING_CALL: "outgoing_call",
  INCOMING_CALL: "incoming_call",
  RINGING: "ringing",
  ACCEPTED: "accepted",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  ENDED: "ended",
});

export const isCallActiveStatus = (status) =>
  [
    CALL_STATUS.OUTGOING_CALL,
    CALL_STATUS.INCOMING_CALL,
    CALL_STATUS.RINGING,
    CALL_STATUS.ACCEPTED,
    CALL_STATUS.CONNECTING,
    CALL_STATUS.CONNECTED,
    CALL_STATUS.RECONNECTING,
  ].includes(status);

const idleCallState = {
  status: CALL_STATUS.IDLE,
  role: null,
  roomName: null,
  type: null,
  peerId: null,
  peerName: null,
  isGroup: false,
  startTime: null,
  endReason: null,
};

const persistSession = (callState) => {
  try {
    sessionStorage.setItem(
      "active_call_session",
      JSON.stringify({
        roomName: callState.roomName,
        type: callState.type,
        peerId: callState.peerId,
        peerName: callState.peerName,
        isGroup: callState.isGroup,
        startTime: callState.startTime,
        role: callState.role,
      })
    );
  } catch (e) {
    console.warn("[CallStore] Failed to persist session:", e);
  }
};

const clearSession = () => {
  try {
    sessionStorage.removeItem("active_call_session");
  } catch (e) { /* ignore */ }
};

const useCallStore = create((set, get) => ({
  callState: { ...idleCallState },
  activeRoom: null,
  isConnecting: false,
  intentionalDisconnect: false,
  isMuted: false,
  isCamOff: false,
  isScreenSharing: false,
  callChatMessages: [],

  addCallChatMessage: (msg) =>
    set((state) => {
      const existsIdx = state.callChatMessages.findIndex((m) => m.id && msg.id && m.id === msg.id);
      if (existsIdx > -1) {
        const updated = [...state.callChatMessages];
        updated[existsIdx] = { ...updated[existsIdx], ...msg };
        return { callChatMessages: updated };
      }
      return { callChatMessages: [...state.callChatMessages, msg] };
    }),

  setCallState: (newCallState) =>
    set((state) => ({
      callState: { ...state.callState, ...newCallState },
    })),

  resetCallState: () => {
    const { activeRoom, _unexpectedDisconnectTimer } = get();

    if (_unexpectedDisconnectTimer) {
      clearTimeout(_unexpectedDisconnectTimer);
    }

    if (activeRoom) {
      try {
        if (activeRoom.localParticipant) {
          activeRoom.localParticipant.trackPublications.forEach((pub) => {
            if (pub.track) {
              try {
                pub.track.stop();
              } catch (e) {
                console.warn("[CallStore] Error stopping track:", e);
              }
            }
          });
        }
        set({ intentionalDisconnect: true, _unexpectedDisconnectTimer: null });
        activeRoom.removeAllListeners?.();
        activeRoom.disconnect();
      } catch (err) {
        console.warn("[CallStore] Error during activeRoom disconnect:", err);
      }
    }

    clearSession();
    set({
      callState: { ...idleCallState },
      activeRoom: null,
      isConnecting: false,
      intentionalDisconnect: false,
      isMuted: false,
      isCamOff: false,
      isScreenSharing: false,
      callChatMessages: [],
      _unexpectedDisconnectTimer: null,
    });
  },

  initCallRoom: async (roomName, token, livekitUrl, type, peerId, peerName, isGroup = false, startTime = null) => {
    const state = get();

    // Guard: already have a connected room for this roomName
    if (state.activeRoom && state.callState.roomName === roomName) {
      console.log("[CallStore] initCallRoom: already connected to this room, skipping.");
      return state.activeRoom;
    }

    // Guard: another connection attempt is in progress
    if (state.isConnecting) {
      console.log("[CallStore] initCallRoom: connection already in progress, skipping.");
      return null;
    }

    // Guard: missing URL or token
    if (!livekitUrl || !token) {
      console.error("[CallStore] initCallRoom: Missing livekitUrl or token.");
      throw new Error("Missing LiveKit URL or token");
    }

    console.log("[CallStore] initCallRoom: Starting connection. roomName:", roomName, "url:", livekitUrl);

    set((s) => ({
      isConnecting: true,
      callState: {
        ...s.callState,
        status: CALL_STATUS.CONNECTING,
        roomName,
        type,
        peerId,
        peerName,
        isGroup,
        startTime,
      },
    }));

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      publishDefaults: {
        simulcast: true,
        videoCodec: "vp8",
        videoEncoding: {
          maxBitrate: 1500000,
          maxFramerate: 30,
        },
        dtx: true,
        red: true,
      },
      videoCaptureDefaults: {
        resolution: {
          width: 1280,
          height: 720,
          frameRate: 30,
        },
        facingMode: "user",
      },
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });

    const syncLocalMediaState = () => {
      set({
        isMuted: !room.localParticipant.isMicrophoneEnabled,
        isCamOff: !room.localParticipant.isCameraEnabled,
        isScreenSharing: room.localParticipant.isScreenShareEnabled,
      });
    };

    room.on(RoomEvent.ConnectionStateChanged, (connectionState) => {
      console.log("[CallStore] ConnectionStateChanged:", connectionState);
      if (connectionState === ConnectionState.Reconnecting) {
        set((s) => ({
          callState: { ...s.callState, status: CALL_STATUS.RECONNECTING },
        }));
      }
      if (connectionState === ConnectionState.Connected) {
        set((s) => ({
          callState: { ...s.callState, status: CALL_STATUS.CONNECTED },
        }));
      }
    });

    room.on(RoomEvent.LocalTrackPublished, syncLocalMediaState);
    room.on(RoomEvent.LocalTrackUnpublished, syncLocalMediaState);
    room.on(RoomEvent.TrackMuted, syncLocalMediaState);
    room.on(RoomEvent.TrackUnmuted, syncLocalMediaState);

    room.on(RoomEvent.ParticipantConnected, (participant) => {
      console.log("[CallStore] Remote participant connected:", participant.identity);
    });

    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      console.log("[CallStore] Remote participant disconnected:", participant.identity);
    });

    room.on(RoomEvent.Disconnected, (reason) => {
      console.log("[CallStore] Room disconnected. Reason:", reason, "Intentional:", get().intentionalDisconnect);

      // If this was an intentional disconnect (resetCallState / cleanup path), ignore it.
      if (get().intentionalDisconnect) {
        set({ intentionalDisconnect: false });
        return;
      }

      const disconnectTimer = setTimeout(() => {
        if (room.state !== ConnectionState.Disconnected) {
          console.log("[CallStore] Room recovered within grace period. Ignoring transient disconnect.");
          return;
        }
        if (get().intentionalDisconnect) {
          set({ intentionalDisconnect: false });
          return;
        }

        console.log("[CallStore] Confirmed unexpected disconnect. Ending call. Reason:", reason);
        clearSession();
        set((s) => ({
          callState: {
            ...s.callState,
            status: CALL_STATUS.ENDED,
            endReason: "media-disconnect",
          },
          activeRoom: null,
          isConnecting: false,
          isMuted: false,
          isCamOff: false,
          isScreenSharing: false,
        }));
      }, 300);
      set({ _unexpectedDisconnectTimer: disconnectTimer });
    });

    try {
      console.log("[CallStore] Connecting to LiveKit room:", roomName, "at", livekitUrl);
      await room.connect(livekitUrl, token, {
        rtcConfig: {
          iceTransportPolicy: "all",
        },
      });
      console.log("[CallStore] Successfully connected to room:", roomName);

      const mediaErrors = [];

      if (type === "video") {
        try {
          await room.localParticipant.setCameraEnabled(true);
        } catch (err) {
          console.warn("[CallStore] Camera enable failed (non-fatal):", err.message);
          mediaErrors.push("camera");
        }
      }

      try {
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch (err) {
        console.warn("[CallStore] Microphone enable failed (non-fatal):", err.message);
        mediaErrors.push("microphone");
      }

      if (mediaErrors.length > 0) {
        toast.error(`Could not access: ${mediaErrors.join(", ")}. Check browser permissions.`, {
          duration: 5000,
        });
      }

      const calculatedStartTime = startTime || Date.now();
      const nextCallState = {
        ...get().callState,
        status: CALL_STATUS.CONNECTED,
        roomName,
        type,
        peerId,
        peerName,
        isGroup,
        startTime: calculatedStartTime,
        endReason: null,
      };

      set({
        activeRoom: room,
        isConnecting: false,
        isMuted: !room.localParticipant.isMicrophoneEnabled,
        isCamOff: !room.localParticipant.isCameraEnabled,
        isScreenSharing: room.localParticipant.isScreenShareEnabled,
        callState: nextCallState,
      });

      persistSession(nextCallState);
      console.log("[CallStore] Room fully initialized. Status: CONNECTED");
      return room;

    } catch (error) {
      console.error("[CallStore] Failed to connect to LiveKit room:", error.message);

      set({ intentionalDisconnect: true });

      try {
        room.removeAllListeners?.();
        room.disconnect();
      } catch (disconnectErr) {
        console.warn("[CallStore] Error during cleanup disconnect:", disconnectErr);
      }

      set((s) => ({
        isConnecting: false,
        intentionalDisconnect: false,
        callState: {
          ...s.callState,
          status: CALL_STATUS.ENDED,
          endReason: "connect-failed",
        },
      }));

      throw error;
    }
  },

  toggleMute: async () => {
    const room = get().activeRoom;
    if (!room?.localParticipant) return;

    try {
      const enabled = room.localParticipant.isMicrophoneEnabled;
      await room.localParticipant.setMicrophoneEnabled(!enabled);
      set({ isMuted: !room.localParticipant.isMicrophoneEnabled });
      toast.success(enabled ? "Microphone muted" : "Microphone unmuted");
    } catch (err) {
      console.error("Mute toggle failed:", err);
      toast.error("Could not toggle microphone");
    }
  },

  toggleCamera: async () => {
    const room = get().activeRoom;
    if (!room?.localParticipant) return;

    try {
      const enabled = room.localParticipant.isCameraEnabled;
      await room.localParticipant.setCameraEnabled(!enabled);
      set({ isCamOff: !room.localParticipant.isCameraEnabled });
      toast.success(enabled ? "Camera off" : "Camera on");
    } catch (err) {
      console.error("Camera toggle failed:", err);
      toast.error("Could not toggle camera");
    }
  },

  toggleScreenShare: async () => {
    const room = get().activeRoom;
    if (!room?.localParticipant) return;

    try {
      const enabled = room.localParticipant.isScreenShareEnabled;
      await room.localParticipant.setScreenShareEnabled(!enabled);
      set({ isScreenSharing: room.localParticipant.isScreenShareEnabled });
      toast.success(!enabled ? "Started sharing screen" : "Stopped sharing screen");
    } catch (err) {
      console.error("Screen share error:", err);
      set({ isScreenSharing: room.localParticipant?.isScreenShareEnabled || false });
      toast.error("Failed to share screen");
    }
  },
}));

export default useCallStore;
