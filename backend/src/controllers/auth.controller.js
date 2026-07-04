import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import OTP from "../models/otp.model.js";
import { sendAndSaveOtp, verifyOtpToken } from "../utils/otp.service.js";

//@desc : Login user
//@route : POST /api/auth/login
//@access : Public
export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "USER_NOT_FOUND" });

  if (!user.passwordHash)
    return res
      .status(400)
      .json({ message: "Use Google/GitHub login" });

  if (!user.isEmailVerified)
    return res.status(403).json({ message: "Verify email first" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(400).json({ message: "Invalid password" });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  const safe = user.toObject();
  delete safe.passwordHash;
  res.json({ user: safe, token });
};

//@desc : Register user
//@route : POST /api/auth/register
//@access : Public
export const registerInit = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (await User.findOne({ email }))
    return res.status(409).json({ message: "Email already exists" });

  const result = await sendAndSaveOtp(email, "register", { firstName, lastName, password });

  if (!result.success) {
    const status = result.retryAfter !== undefined ? 429 : 500;
    return res.status(status).json(result);
  }

  res.json({ message: "OTP sent" });
};

//@desc : Verify OTP for both register and forgot password
//@route : POST /api/auth/verify-otp
//@access : Public
export const verifyOtp = async (req, res) => {
  const { email, otp, type } = req.body;

  const verifyType = type || "register";
  const result = await verifyOtpToken(email, otp, verifyType);

  if (!result.success) {
    return res.status(400).json({ message: result.message });
  }
  const record = result.record;

  /*  If requested for FORGOT PASSWORD */
  if (record.type === "forgot") {
    record.verified = true;
    await record.save();
    return res.json({ message: "OTP verified. Proceed to reset password." });
  }

  /* if requested for REGISTER */
  const { firstName, lastName, password } = record.data;

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    firstName,
    lastName,
    email,
    passwordHash,
    isEmailVerified: true,
    providers: [{ provider: "local" }],
  });

  await record.deleteOne();

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  const safe = user.toObject();
  delete safe.passwordHash;

  res.json({ user: safe, token });
};

//@desc : Forgot password
//@route : POST /api/auth/forgot
//@access : Public
export const sendForgotOtp = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  const result = await sendAndSaveOtp(email, "forgot");

  if (!result.success) {
    const status = result.retryAfter !== undefined ? 429 : 500;
    return res.status(status).json({ ...result, next: "reset-password" });
  }

  res.json({ message: "OTP sent" });
};

//@desc : Reset password
//@route : POST /api/auth/reset-password
//@access : Public
export const resetPassword = async (req, res) => {
  const { email, password } = req.body;

  const record = await OTP.findOne({ email, type: "forgot" });

  if (!record || !record.verified) {
    return res.status(403).json({ message: "OTP not verified" });
  }

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  user.passwordHash = await bcrypt.hash(password, 10);
  await user.save();

  await record.deleteOne();

  res.json({ message: "Password reset successful" });
};

//@desc : Set password (OAUTH)
//@route : POST /api/auth/set-password
//@access : Private
export const setPassword = async (req, res) => {
  const { password } = req.body;
  const userId = req.user._id;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();

    res.json({ message: "Password set successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error setting password" });
  }
};

import { sendOtpEmail } from "../utils/email.js";

export const testEmail = async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: "Email query parameter is required" });
  try {
    await sendOtpEmail(email, "123456", "Test Connection OTP");
    res.json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack,
    });
  }
};
