import api from "./api";

// Translation API service Translate a message text to the user's preferred language.
const translationService = {
    translateMessage: async ({ text, targetLanguage }) => {
        const res = await api.post("/translation/translate", { text, targetLanguage });
        return res.data;
    },

    updateTranslationLanguage: async (language) => {
        const res = await api.patch("/translation/language", { language });
        return res.data;
    },

    getSupportedLanguages: async () => {
        const res = await api.get("/translation/languages");
        return res.data.languages || [];
    },
};

export default translationService;
