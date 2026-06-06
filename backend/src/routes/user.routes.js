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
  getRandomUsers,
} from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";

const router = express.Router();

router.get("/me", authenticate, getCurrentUser);
router.get("/random", authenticate, getRandomUsers);
router.get("/", authenticate, getAllUsers);
router.get("/:id", authenticate, getUserById);
router.put("/:id", authenticate, updateUser);
router.delete("/:id", authenticate, deleteUser);
router.patch("/me/profile", authenticate, updateMyProfile);
router.patch("/me/password", authenticate, changePassword);
router.patch("/me/avatar", authenticate, upload.single("profileImage"), uploadAvatar);

export default router;
