import express from "express";
import upload from "../middlewares/upload.middleware.js";
import {
  sendGroupMessage,
  getGroupMessages,
  updateGroupMessage,
  deleteGroupMessage,
  sendGroupMediaMessage,
} from "../controllers/groupMessage.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All group message routes require authentication
router.use(authenticate);

router.post("/", sendGroupMessage);
router.post("/media", upload.single("file"), sendGroupMediaMessage);
router.get("/:groupId", getGroupMessages);
router.put("/:id", updateGroupMessage);
router.delete("/:id", deleteGroupMessage);

export default router;
