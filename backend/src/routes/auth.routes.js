// backend/routes/auth.routes.js
import express from "express";
import {
  login,
  registerInit, 
  verifyOtp,
  sendForgotOtp,
  resetPassword,
  setPassword,
} from "../controllers/auth.controller.js";
import { authLimiter } from "../middlewares/rateLimiter.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Apply rate limiter to all auth routes
router.use(authLimiter);

/* ===========================
   AUTH ROUTES (PUBLIC)
=========================== */

// Login with email/password
router.post("/login", login);

// Register new user
router.post("/register-init", registerInit);

// Verify OTP after register
router.post("/verify-otp", verifyOtp);

// Forgot password - send OTP
router.post("/forgot", sendForgotOtp);

// Reset password using OTP
router.post("/reset-password", resetPassword);

// Set password (Authenticated users - e.g. OAuth)
router.post("/set-password", authenticate, setPassword);

export default router;


