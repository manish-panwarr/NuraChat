import mongoose from "mongoose";

const groupMemberSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    role: {
      type: String,
      enum: ["creator", "admin", "member"],
      default: "member"
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending"
    },

    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    invitedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

export default mongoose.model("GroupMember", groupMemberSchema);
