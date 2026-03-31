import express from "express";
import upload from "../middlewares/upload.middleware.js";
import {
  sendMessage,
  getMessagesByChat,
  updateMessage,
  deleteMessage,
  sendMediaMessage,
} from "../controllers/message.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All message routes require authentication
router.use(authenticate);

router.post("/", sendMessage);
router.post("/media", upload.single("file"), sendMediaMessage);
router.get("/chat/:chatId", getMessagesByChat);
router.put("/:id", updateMessage);
router.delete("/:id", deleteMessage);

export default router;
