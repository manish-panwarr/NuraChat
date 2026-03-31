import OTP from "../models/otp.model.js";
import bcrypt from "bcryptjs";
import { sendOtpEmail } from "./email.js"; // Needs to be checked where this is located

// Generates a 6 digit numeric OTP
export const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Sends OTP and saves to DB
export const sendAndSaveOtp = async (email, type, data = {}) => {
    // Check if unexpired OTP exists to apply rate limiting/cooldown
    const existingOtp = await OTP.findOne({ email, type });
    if (existingOtp) {
        // If it exists and expires in future, wait
        const remainingSeconds = Math.ceil((existingOtp.expiresAt.getTime() - Date.now()) / 1000);
        if (remainingSeconds > 0) {
            // Only allow resend if older than 1 minute (4 minutes left of 5 minute expiry)
            if (remainingSeconds > 240) {
                return {
                    success: false,
                    message: "OTP recently sent. Please wait before requesting another.",
                    retryAfter: remainingSeconds - 240
                };
            } else {
                // delete old one to send new one
                await OTP.deleteOne({ _id: existingOtp._id });
            }
        } else {
            await OTP.deleteOne({ _id: existingOtp._id });
        }
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    // 5 minutes expiry
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const otpRecord = new OTP({
        email,
        otpHash,
        type,
        data,
        expiresAt,
    });

    await otpRecord.save();

    // Async email sending
    sendOtpEmail(email, otp, type === "forgot" ? "Reset Password OTP" : "Verify your account")
        .catch((err) => console.error("Email sending failed:", err));

    return { success: true, message: "OTP sent successfully" };
};

// Verifies OTP
export const verifyOtpToken = async (email, otp, type) => {
    const otpRecord = await OTP.findOne({ email, type });

    if (!otpRecord) return { success: false, message: "OTP not found or expired" };

    if (Date.now() > otpRecord.expiresAt.getTime()) {
        await OTP.deleteOne({ _id: otpRecord._id });
        return { success: false, message: "OTP expired" };
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isValid) return { success: false, message: "Invalid OTP" };

    return { success: true, record: otpRecord };
};
