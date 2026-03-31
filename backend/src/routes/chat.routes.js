import express from "express";
import {
  createChat,
  getUserChats,
  getChatById,
  deleteChat,
} from "../controllers/chat.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All chat routes require authentication
router.use(authenticate);

router.post("/", createChat);
router.get("/", getUserChats); // Get chats for authenticated user
router.get("/:id", getChatById);
router.delete("/:id", deleteChat);

export default router;
