
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      default: null,
    },

    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    messageType: {
      type: String,
      enum: ["text", "image", "video", "document", "audio"],
      required: true,
    },

    encryptedPayload: {
      type: String,
      default: null,
    },

    mediaUrl: {
      type: String,
      default: null,
    },

    mediaMeta: {
      type: Object,
      default: null,
    },

    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
  },
  { timestamps: true }
);

// Indexes for fast message retrieval
messageSchema.index({ chatId: 1, createdAt: 1 });
messageSchema.index({ groupId: 1, createdAt: 1 });

export default mongoose.model("Message", messageSchema);
