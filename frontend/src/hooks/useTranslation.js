import { useState, useCallback } from "react";
import translationService from "../services/translationService";
import useAuthStore from "../store/authStore";
import { toast } from "react-hot-toast";

// @desc : useTranslation hook
// Manages translation state per message.
// Local in-memory cache keyed by `messageId:targetLanguage`
// Prevents concurrent requests for the same message

const useTranslation = () => {
    const [translations, setTranslations] = useState({});

    const [translatingIds, setTranslatingIds] = useState(new Set());

    const user = useAuthStore((s) => s.user);

    const getTargetLanguage = useCallback(() => {
        return user?.translationLanguage || "English";
    }, [user?.translationLanguage]);

    const getCacheKey = useCallback((messageId) => {
        return `${messageId}:${getTargetLanguage()}`;
    }, [getTargetLanguage]);

    const translate = useCallback(async (messageId, text) => {
        if (!messageId || !text || !text.trim()) return;

        const cacheKey = getCacheKey(messageId);
        const targetLanguage = getTargetLanguage();

        if (translations[cacheKey]) return;

        if (translatingIds.has(messageId)) return;

        setTranslatingIds((prev) => new Set(prev).add(messageId));

        try {
            const result = await translationService.translateMessage({
                text: text.trim(),
                targetLanguage,
            });

            setTranslations((prev) => ({
                ...prev,
                [cacheKey]: {
                    translatedText: result.translatedText,
                    sourceLanguage: result.sourceLanguage,
                    targetLanguage: result.targetLanguage,
                },
            }));
        } catch (err) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Translation failed. Please try again.";
            toast.error(message, { id: `translate-err-${messageId}` });
        } finally {
            setTranslatingIds((prev) => {
                const next = new Set(prev);
                next.delete(messageId);
                return next;
            });
        }
    }, [translations, translatingIds, getCacheKey, getTargetLanguage]);

    const getTranslation = useCallback((messageId) => {
        const cacheKey = getCacheKey(messageId);
        return translations[cacheKey] || null;
    }, [translations, getCacheKey]);

    const clearTranslation = useCallback((messageId) => {
        const cacheKey = getCacheKey(messageId);
        setTranslations((prev) => {
            const next = { ...prev };
            delete next[cacheKey];
            return next;
        });
    }, [getCacheKey]);

    const isTranslating = useCallback((messageId) => {
        return translatingIds.has(messageId);
    }, [translatingIds]);

    return {
        translate,
        getTranslation,
        clearTranslation,
        isTranslating,
    };
};

export default useTranslation;
