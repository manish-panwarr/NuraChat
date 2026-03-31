import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["register", "forgot"],
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed, // Stores firstName, lastName, password for register
      default: {},
    },
    verified: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index, auto-deleted when expiresAt is reached
    },
  },
  { timestamps: true }
);

export default mongoose.model("OTP", otpSchema);
