import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,

    email: {
      type: String,
      sparse: true,
      lowercase: true,
      unique: true,
    },

    passwordHash: {
      type: String,
      // required : false, // Optional for OAuth users (Google, GitHub)
    },

    username: {
      type: String,
      unique: true,
      sparse: true,
    },

    mobileNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    dob: Date,

    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    profileImage: {
      type: String,   // profile picture ka URL
      default: null
    },

    statusText: {
      type: String,
      default: "Hey team, I'm away from laptop...",
    },

    lastSeen: {
      type: Date,
      default: Date.now,
    },

    publicKey: String,

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    providers: [
      {
        provider: {
          type: String,
          enum: ["local", "google", "github"],
        },
        providerUserId: String,
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
