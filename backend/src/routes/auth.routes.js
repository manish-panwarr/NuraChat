import express from "express";
import {
  login,
  registerInit,
  verifyOtp,
  sendForgotOtp,
  resetPassword,
  setPassword,
  testEmail,
} from "../controllers/auth.controller.js";
import { authLimiter } from "../middlewares/rateLimiter.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authLimiter);     // Apply rate limiter to all auth routes

//@desc : Login user
//@route : POST /api/auth/login
//@access : Public
router.post("/login", login);

//@desc : Register user
//@route : POST /api/auth/register-init
//@access : Public
router.post("/register-init", registerInit);

//@desc : Verify OTP after register
//@route : POST /api/auth/verify-otp
//@access : Public
router.post("/verify-otp", verifyOtp);

//@desc : Forgot password - send OTP
//@route : POST /api/auth/forgot
//@access : Public
router.post("/forgot", sendForgotOtp);

//@desc : Reset password using OTP
//@route : POST /api/auth/reset-password
//@access : Public
router.post("/reset-password", resetPassword);

//@desc : Set password (Authenticated users - e.g. OAuth)
//@route : POST /api/auth/set-password
//@access : Private
router.post("/set-password", authenticate, setPassword);

//@desc : Test email sending config
//@route : GET /api/auth/test-email
//@access : Public
router.get("/test-email", testEmail);

export default router;


