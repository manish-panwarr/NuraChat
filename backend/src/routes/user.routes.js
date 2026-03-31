// backend/routes/user.routes.js
import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getCurrentUser,
  updateMyProfile,
  changePassword,
  uploadAvatar,
} from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";

const router = express.Router();

/* ===========================
   USER ROUTES
=========================== */

// Get currently logged-in user
router.get("/me", authenticate, getCurrentUser);

// Get all users (for chat / admin)
// 🔒 Protected
router.get("/", authenticate, getAllUsers);

// Get user by ID
router.get("/:id", authenticate, getUserById);

// Update user (self / admin logic can be added later)
router.put("/:id", authenticate, updateUser);

// Delete user
router.delete("/:id", authenticate, deleteUser);

// routes/user.routes.js
router.patch("/me/profile", authenticate, updateMyProfile);
router.patch("/me/password", authenticate, changePassword);
router.patch("/me/avatar", authenticate, upload.single("profileImage"), uploadAvatar);


/*
 ❌ REMOVED:
 router.post("/", createUser);

 Reason:
 - User creation must ONLY happen via:
   /auth/register
   OAuth
*/

export default router;
