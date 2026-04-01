import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import authService from "../../services/authService";
import SideImage from "./SideImage";
import "../../styles/login.css";

const DIGITS = 6;
const RESEND_COOLDOWN = 60;
const OTP_EXPIRY = 300;

function Verification() {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyOtp, isLoading } = useAuth();

  const email =
    location.state?.email || localStorage.getItem("pendingEmail");
  const mode =
    location.state?.mode || localStorage.getItem("otpMode") || "register";

  const [code, setCode] = useState(Array(DIGITS).fill(""));
  const inputsRef = useRef([]);
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [otpExpiry, setOtpExpiry] = useState(OTP_EXPIRY);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!email) {
      toast.error("No email found. Please register again.");
      navigate("/register");
    }
  }, [email, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (otpExpiry <= 0) return;
    const timer = setInterval(() => {
      setOtpExpiry((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpExpiry]);

  const handleChange = (i, value) => {
    if (!/^\d?$/.test(value)) return;
    const newCode = [...code];
    newCode[i] = value;
    setCode(newCode);
    if (value && i < DIGITS - 1) {
      inputsRef.current[i + 1]?.focus();
    }
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !code[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, DIGITS);
    if (pasted.length === DIGITS) {
      setCode(pasted.split(""));
      inputsRef.current[DIGITS - 1]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otp = code.join("");
    if (otp.length !== DIGITS) {
      toast.error("Enter full OTP");
      return;
    }
    if (otpExpiry <= 0) {
      toast.error("OTP has expired. Please request a new one.");
      return;
    }
    setVerifying(true);
    try {
      await verifyOtp(email, otp, mode);
      localStorage.removeItem("pendingEmail");
      localStorage.removeItem("otpMode");
      if (mode === "register") {
        navigate("/home");
      } else {
        navigate("/login/forgot/verification/resetpass", {
          state: { email },
        });
      }
    } catch {
      setCode(Array(DIGITS).fill(""));
      inputsRef.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    try {
      await authService.resendOtp({ email, type: mode });
      toast.success("New OTP sent!");
      setResendCooldown(RESEND_COOLDOWN);
      setOtpExpiry(OTP_EXPIRY);
      setCode(Array(DIGITS).fill(""));
      inputsRef.current[0]?.focus();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  }, [resendCooldown, resending, email, mode]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <SideImage img="/images/login/nurachat-couple.jpg" />
      </div>

      <div className="login-right">
        <h2 className="text-3xl mb-3" style={{ color: 'var(--text-color)' }}>Verification Code</h2>
        <p className="text-sm mb-2" style={{ color: 'var(--text-color)' }}>
          A 6-digit code was sent to <b>{email}</b>
        </p>

        {otpExpiry > 0 ? (
          <p className={`text-xs mb-6 ${otpExpiry < 60 ? "text-red-500" : ""}`} style={otpExpiry >= 60 ? { color: '#9ca3af' } : {}}>
            Code expires in {formatTime(otpExpiry)}
          </p>
        ) : (
          <p className="text-xs mb-6 text-red-500 font-medium">
            OTP expired. Please request a new one.
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
            {code.map((c, i) => (
              <input
                key={i}
                ref={(el) => (inputsRef.current[i] = el)}
                maxLength={1}
                value={c}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`auth-otp-input w-[55px] h-[55px] text-center text-2xl rounded-full ${c ? 'filled' : ''}`}
                autoFocus={i === 0}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={verifying || otpExpiry <= 0}
            className="auth-btn-primary"
          >
            {verifying ? "Verifying..." : "Verify"}
          </button>
        </form>

        <div className="mt-4 text-center">
          {resendCooldown > 0 ? (
            <p className="text-sm" style={{ color: '#9ca3af' }}>
              Resend OTP in {formatTime(resendCooldown)}
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-sm font-medium hover:underline disabled:opacity-50"
              style={{ color: '#14b8a6' }}
            >
              {resending ? "Sending..." : "Resend OTP"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Verification;
