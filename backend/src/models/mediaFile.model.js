import mongoose from "mongoose";

const mediaFileSchema = new mongoose.Schema(
  {
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    fileType: {
      type: String,
      enum: ["image", "video", "pdf", "doc", "other"],
    },

    cloudinaryUrl: String,
    cloudinaryPublicId: String,

    fileSize: Number,
  },
  { timestamps: true }
);

export default mongoose.model("MediaFile", mediaFileSchema);
