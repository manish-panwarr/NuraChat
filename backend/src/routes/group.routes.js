import express from "express";
import upload from "../middlewares/upload.middleware.js";
import {
  createGroup,
  getMyGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  uploadGroupAvatar,
} from "../controllers/group.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All group routes require authentication
router.use(authenticate);

router.post("/", createGroup);
router.get("/", getMyGroups);
router.get("/:id", getGroupById);
router.put("/:id", updateGroup);
router.delete("/:id", deleteGroup);
router.post("/upload-avatar/:id", upload.single("file"), uploadGroupAvatar);

export default router;
