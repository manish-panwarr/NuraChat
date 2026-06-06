import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    chatType: {
      type: String,
      enum: ["private", "public"],
      default: "private",
    },

    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    lastMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },

    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    messageExpiryAt: Date,
  },
  { timestamps: true }
);

chatSchema.index({ participants: 1 });
chatSchema.index({ updatedAt: -1 });

export default mongoose.model("Chat", chatSchema);
