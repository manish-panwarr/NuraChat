import express from "express";
import {
  addMember,
  getGroupMembers,
  updateMemberRole,
  removeMember,
  acceptInvite,
  rejectInvite
} from "../controllers/groupMember.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All group member routes require authentication
router.use(authenticate);

router.post("/accept", acceptInvite);
router.post("/reject", rejectInvite);
router.post("/", addMember);
router.get("/:groupId", getGroupMembers);
router.put("/:id", updateMemberRole);
router.delete("/:id", removeMember);

export default router;
