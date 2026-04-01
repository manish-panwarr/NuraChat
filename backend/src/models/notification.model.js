import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    
    type: {
      type: String,
      enum: ["group_invite", "group_role_update", "system"],
      required: true
    },
    
    title: {
      type: String,
      required: true
    },
    
    body: {
      type: String,
      required: true
    },
    
    data: {
      groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      groupName: String
    },
    
    isRead: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
