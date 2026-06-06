import { InferenceClient } from "@huggingface/inference";
import crypto from "crypto";
import fs from "fs";
import path from "path";

//@desc : Language Map 
//@use :  Central source of truth for mBART-50 language codes.
export const LANGUAGE_MAP = {
    "English": "en_XX",
    "Hindi": "hi_IN",
    "Spanish": "es_XX",
    "French": "fr_XX",
    "German": "de_DE",
    "Japanese": "ja_XX",
    "Chinese": "zh_CN",
    "Arabic": "ar_AR",
};

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_MAP);

//@desc : reverse language map for display (e.g. "hi_IN" -> "Hindi")
const REVERSE_LANGUAGE_MAP = Object.entries(LANGUAGE_MAP).reduce((acc, [name, code]) => {
    acc[code] = name;
    return acc;
}, {});

//@desc : Cache Key Generator 
export function generateCacheKey(text, targetLanguage) {
    return crypto
        .createHash("sha256")
        .update(text.trim() + "::" + targetLanguage)
        .digest("hex");
}

export function getLanguageCode(languageName) {
    const code = LANGUAGE_MAP[languageName];
    if (!code) {
        throw new Error(
            `Unsupported language: "${languageName}". Supported languages: ${SUPPORTED_LANGUAGES.join(", ")}`
        );
    }
    return code;
}

export function detectLanguage(text) {
    const cleanText = text.trim().toLowerCase();
    if (!cleanText) return "en_XX";

    if (/[\u0900-\u097F]/.test(text)) return "hi_IN";
    if (/[\u0600-\u06FF]/.test(text)) return "ar_AR";
    if (/[\u3040-\u309F\u30A0-\u30FF\uFF66-\uFF9F]/.test(text)) return "ja_XX";
    if (/[\u4E00-\u9FFF]/.test(text)) return "zh_CN";

    const words = cleanText.split(/\s+/);

    const spanishWords = new Set(["el", "la", "los", "las", "y", "en", "que", "es", "con", "por", "para", "como", "pero"]);
    const frenchWords = new Set(["le", "la", "les", "et", "en", "que", "est", "dans", "pour", "avec", "mais", "sur"]);
    const germanWords = new Set(["der", "die", "das", "und", "in", "ist", "mit", "für", "von", "zu", "aber", "oder"]);

    let esCount = 0;
    let frCount = 0;
    let deCount = 0;

    for (const w of words) {
        if (spanishWords.has(w)) esCount++;
        if (frenchWords.has(w)) frCount++;
        if (germanWords.has(w)) deCount++;
    }

    // Accent-based weights
    if (/[äöüß]/i.test(text)) deCount += 2;
    if (/[éèàùçâêîôûëïüÿœæ]/i.test(text)) frCount += 2;
    if (/[áéíóúüñ¿¡]/i.test(text)) esCount += 2;

    const max = Math.max(esCount, frCount, deCount);
    if (max > 0) {
        if (max === esCount) return "es_XX";
        if (max === frCount) return "fr_XX";
        if (max === deCount) return "de_DE";
    }

    return "en_XX";
}

//  Core Translation Function 
export async function translateText(text, targetLanguageName) {
    if (!text || !text.trim()) {
        throw new Error("Text is required for translation.");
    }
    if (!targetLanguageName) {
        throw new Error("Target language is required.");
    }

    const targetCode = getLanguageCode(targetLanguageName);
    const sourceCode = detectLanguage(text);

    if (sourceCode === targetCode) {
        return {
            translatedText: text.trim(),
            sourceLanguage: REVERSE_LANGUAGE_MAP[sourceCode] || null,
            targetLanguage: targetLanguageName,
        };
    }

    if (!process.env.HF_TOKEN) {
        throw new Error("HF_TOKEN environment variable is not configured.");
    }

    const model =
        process.env.HF_TRANSLATION_MODEL || "facebook/mbart-large-50-many-to-many-mmt";

    const client = new InferenceClient(process.env.HF_TOKEN);

    let raw;
    try {
        raw = await client.translation({
            model,
            inputs: text.trim(),
            parameters: {
                src_lang: sourceCode,
                tgt_lang: targetCode,
            },
        });
    } catch (err) {
        try {
            const logPath = path.resolve("translation-debug.log");
            const logData = {
                timestamp: new Date().toISOString(),
                tokenExists: !!process.env.HF_TOKEN,
                tokenLength: process.env.HF_TOKEN ? process.env.HF_TOKEN.length : 0,
                tokenPrefix: process.env.HF_TOKEN ? process.env.HF_TOKEN.substring(0, 10) : "",
                model,
                text,
                targetLanguageName,
                targetCode,
                sourceCode,
                errorMessage: err?.message,
                errorStack: err?.stack,
                errorName: err?.name,
                errorResponseText: err?.response ? await err.response.text().catch(() => "failed to read body") : null,
                errorKeys: Object.keys(err || {}),
                rawError: err,
            };
            fs.appendFileSync(logPath, JSON.stringify(logData, null, 2) + "\n\n");
        } catch (logErr) {
            console.error("Failed to write to debug log file:", logErr);
        }

        const message = err?.message || "Unknown Hugging Face error";
        if (message.includes("401") || message.includes("Unauthorized")) {
            throw new Error("Invalid Hugging Face token. Check HF_TOKEN.");
        }
        if (message.includes("503") || message.includes("Service Unavailable")) {
            throw new Error("Hugging Face service is temporarily unavailable.");
        }
        throw new Error(`Translation provider error: ${message}`);
    }

    const translatedText =
        raw?.translation_text ||
        (Array.isArray(raw) && raw[0]?.translation_text) ||
        null;

    if (!translatedText) {
        throw new Error("Translation failed: empty response received from provider.");
    }

    return {
        translatedText,
        sourceLanguage: REVERSE_LANGUAGE_MAP[sourceCode] || null,
        targetLanguage: targetLanguageName,
    };
}
