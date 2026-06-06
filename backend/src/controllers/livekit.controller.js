import { AccessToken } from "livekit-server-sdk";
import Chat from "../models/chat.model.js";
import GroupMember from "../models/groupMember.model.js";
import { writeToDebugLog, activeCalls } from "../sockets/socket.js";

// @desc get livekit token
export const getLiveKitToken = async (req, res) => {
  try {
    const { roomName } = req.body;
    const user = req.user;

    writeToDebugLog(`[LiveKit Token] Request received. roomName=${roomName}, userId=${user?._id}`);

    if (!roomName) {
      writeToDebugLog(`[LiveKit Token] Abort: roomName is missing`);
      return res.status(400).json({ message: "roomName is required" });
    }

    let isAuthorized = false;

    const activeCall = activeCalls.get(roomName);
    if (activeCall) {
      const isParticipant =
        activeCall.callerId === user._id.toString() ||
        activeCall.receiverId === user._id.toString() ||
        (activeCall.participants && activeCall.participants.has(user._id.toString())) ||
        (activeCall.invitedUsers && activeCall.invitedUsers.has(user._id.toString()));
      if (isParticipant) {
        isAuthorized = true;
        writeToDebugLog(`[LiveKit Token] Authorized via activeCalls lookup for roomName=${roomName}`);
      }
    }

    if (!isAuthorized) {
      if (roomName.startsWith("call_")) {
        const idPart = roomName.replace("call_", "");

        if (idPart.match(/^[0-9a-fA-F]{24}$/)) {
          const chat = await Chat.findById(idPart);
          if (chat) {
            isAuthorized = chat.participants.some(
              (pId) => (pId._id || pId).toString() === user._id.toString()
            );
            writeToDebugLog(`[LiveKit Token] 1-to-1 chat authorized check: ${isAuthorized}`);
          } else {
            const member = await GroupMember.findOne({
              groupId: idPart,
              userId: user._id,
              status: "accepted",
            });
            if (member) {
              isAuthorized = true;
            }
            writeToDebugLog(`[LiveKit Token] Group member check: isAuthorized=${isAuthorized}`);
          }
        } else {
          writeToDebugLog(`[LiveKit Token] idPart does not match hex regex. roomName=${roomName}`);
        }
      } else {
        isAuthorized = true;
        writeToDebugLog(`[LiveKit Token] Custom room check fallback: isAuthorized=true`);
      }
    }

    if (!isAuthorized) {
      writeToDebugLog(`[LiveKit Token] Forbidden. roomName=${roomName}, userId=${user?._id}`);
      return res.status(403).json({ message: "You are not authorized to join this room's call" });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      writeToDebugLog(`[LiveKit Token] Error: Missing credentials in .env`);
      console.error("LiveKit credentials not configured in backend .env");
      return res.status(500).json({ message: "LiveKit service is not configured correctly" });
    }

    const participantIdentity = user._id.toString();
    const participantName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "Guest";

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: participantName,
      ttl: "1h",
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    writeToDebugLog(`[LiveKit Token] Token generated successfully. Identity=${participantIdentity}, TokenLength=${token.length}`);

    return res.status(200).json({
      token,
      room: roomName,
      identity: participantIdentity,
      name: participantName,
    });
  } catch (error) {
    writeToDebugLog(`[LiveKit Token] Exception: ${error.message}\nStack: ${error.stack}`);
    console.error("Error generating LiveKit token:", error);
    return res.status(500).json({ message: "Failed to generate calling token" });
  }
};
