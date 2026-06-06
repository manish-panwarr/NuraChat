import express from "express";
import upload from "../middlewares/upload.middleware.js";
import {
  sendMessage,
  getMessagesByChat,
  updateMessage,
  deleteMessage,
  sendMediaMessage,
  deleteMessageForMe,
  deleteMessagesForMeBatch,
  clearChat,
} from "../controllers/message.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authenticate);

router.post("/", sendMessage);
router.post("/media", upload.single("file"), sendMediaMessage);
router.get("/chat/:chatId", getMessagesByChat);
router.put("/:id", updateMessage);
router.delete("/:id", deleteMessage);
router.post("/clear-chat", clearChat);
router.post("/delete-for-me/batch", deleteMessagesForMeBatch);
router.delete("/delete-for-me/:id", deleteMessageForMe);

export default router;
