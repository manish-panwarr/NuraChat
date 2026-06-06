import mongoose from "mongoose";

const translationCacheSchema = new mongoose.Schema({
    cacheKey: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    originalText: {
        type: String,
        required: true,
    },
    translatedText: {
        type: String,
        required: true,
    },
    sourceLanguage: {
        type: String,
        default: null,
    },
    targetLanguage: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 60 * 24 * 7, // auto-delete after 7 days
    },
});

export default mongoose.model("TranslationCache", translationCacheSchema);
