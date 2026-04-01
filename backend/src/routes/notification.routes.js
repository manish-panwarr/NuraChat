import express from "express";
import {
  getMyNotifications,
  markAsRead,
  deleteNotification
} from "../controllers/notification.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Require auth
router.use(authenticate);

router.get("/", getMyNotifications);
router.put("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

export default router;
