import TranslationCache from "../models/translationCache.model.js";
import User from "../models/user.model.js";
import {
    translateText,
    generateCacheKey,
    SUPPORTED_LANGUAGES,
} from "../services/translation.service.js";


//@desc translate message
export const translateMessage = async (req, res) => {
    const { text, targetLanguage } = req.body;

    if (!text || !text.trim()) {
        return res.status(400).json({
            success: false,
            message: "text is required and must not be empty.",
        });
    }

    if (!targetLanguage) {
        return res.status(400).json({
            success: false,
            message: "targetLanguage is required.",
        });
    }

    if (!SUPPORTED_LANGUAGES.includes(targetLanguage)) {
        return res.status(400).json({
            success: false,
            message: `Unsupported target language: "${targetLanguage}". Supported: ${SUPPORTED_LANGUAGES.join(", ")}`,
        });
    }

    if (text.trim().length > 2000) {
        return res.status(400).json({
            success: false,
            message: "Message is too long to translate (max 2000 characters).",
        });
    }

    const cacheKey = generateCacheKey(text.trim(), targetLanguage);

    try {
        const cached = await TranslationCache.findOne({ cacheKey });

        if (cached) {
            return res.json({
                success: true,
                translatedText: cached.translatedText,
                sourceLanguage: cached.sourceLanguage,
                targetLanguage: cached.targetLanguage,
                cached: true,
            });
        }

        const result = await translateText(text, targetLanguage);

        await TranslationCache.findOneAndUpdate(
            { cacheKey },
            {
                cacheKey,
                originalText: text.trim(),
                translatedText: result.translatedText,
                sourceLanguage: result.sourceLanguage,
                targetLanguage: result.targetLanguage,
                createdAt: new Date(),
            },
            { upsert: true, new: true }
        );

        return res.json({
            success: true,
            translatedText: result.translatedText,
            sourceLanguage: result.sourceLanguage,
            targetLanguage: result.targetLanguage,
            cached: false,
        });
    } catch (error) {
        console.error("[TranslationController] Error:", error.message);

        if (error.message.includes("Unsupported language")) {
            return res.status(400).json({ success: false, message: error.message });
        }
        if (error.message.includes("HF_TOKEN")) {
            return res.status(500).json({
                success: false,
                message: "Translation service is not configured correctly.",
            });
        }

        return res.status(503).json({
            success: false,
            message: "Translation service unavailable. Please try again later.",
        });
    }
};

//@desc update translation language
export const updateTranslationLanguage = async (req, res) => {
    const { language } = req.body;

    if (!language) {
        return res.status(400).json({ success: false, message: "language is required." });
    }

    if (!SUPPORTED_LANGUAGES.includes(language)) {
        return res.status(400).json({
            success: false,
            message: `Unsupported language. Supported: ${SUPPORTED_LANGUAGES.join(", ")}`,
        });
    }

    try {
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { translationLanguage: language },
            { returnDocument: "after" }
        ).select("-passwordHash");

        return res.json({
            success: true,
            message: "Translation language updated successfully.",
            user,
        });
    } catch (error) {
        console.error("Update language error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to update translation language.",
        });
    }
};

//@desc get supported languages
export const getSupportedLanguages = async (req, res) => {
    return res.json({ success: true, languages: SUPPORTED_LANGUAGES });
};
