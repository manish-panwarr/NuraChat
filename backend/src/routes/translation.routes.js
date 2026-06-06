import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
    translateMessage,
    updateTranslationLanguage,
    getSupportedLanguages,
} from "../controllers/translation.controller.js";

const router = express.Router();

//@desc : translation limiter
const translationLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: {
        success: false,
        message: "Too many translation requests. Please slow down.",
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req.ip),
});

//@desc : translate message
router.post("/translate", authenticate, translationLimiter, translateMessage);
//@desc : update translation language
router.patch("/language", authenticate, updateTranslationLanguage);
//@desc : get supported languages
router.get("/languages", authenticate, getSupportedLanguages);

export default router;
