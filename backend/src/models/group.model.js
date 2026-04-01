import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    groupName: {
      type: String,
      required: true
    },

    groupAvatar: {
      type: String
    },

    description: {
      type: String,
      default: ""
    },

    encryptionSalt: {
      type: String,
      default: ""
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Group", groupSchema);
