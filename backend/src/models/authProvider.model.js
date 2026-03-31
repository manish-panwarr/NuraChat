import mongoose from "mongoose";

const authProviderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    provider: {
      type: String,
      enum: ["google", "facebook", "github", "local"],
      required: true,
    },

    providerUserId: String,
  },
  { timestamps: true }
);

export default mongoose.model("AuthProvider", authProviderSchema);
