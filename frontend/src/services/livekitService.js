import api from "./api";

export const getLiveKitToken = async (roomName) => {
  const response = await api.post("/livekit/token", { roomName });
  return response.data;
};
