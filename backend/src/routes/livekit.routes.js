import express from "express";
import { getLiveKitToken } from "../controllers/livekit.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

//@desc Route to get a LiveKit Access Token
//@route POST /api/livekit/token
router.post("/token", authenticate, getLiveKitToken);

export default router;
