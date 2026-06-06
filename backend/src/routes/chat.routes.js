import express from "express";
import {
  createChat,
  getUserChatsController as getUserChats,
  getChatById,
  deleteChat,
} from "../controllers/chat.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authenticate);  // All chat routes require authentication

router.post("/", createChat);
router.get("/", getUserChats);
router.get("/:id", getChatById);
router.delete("/:id", deleteChat);

export default router;
