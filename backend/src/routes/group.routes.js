import express from "express";
import {
  createGroup,
  getMyGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
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

export default router;
