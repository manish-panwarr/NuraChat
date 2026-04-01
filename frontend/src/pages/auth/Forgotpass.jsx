import React, { useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import SideImage from "./SideImage";
import "../../styles/login.css";

function Forgotpass() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !email.trim()) return;

    setSubmitting(true);
    try {
      await forgotPassword(email);
      localStorage.setItem("pendingEmail", email);
      localStorage.setItem("otpMode", "forgot");
      navigate("/login/forgot/verification", {
        state: { email, mode: "forgot" },
      });
    } catch {
      // Error handled by useAuth hook
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <SideImage img="/images/login/nurachat-features.png" />
      </div>

      <div className="login-right relative">
        <div className="absolute top-20 left-5">
          <Link to="/login" style={{ color: 'var(--text-color)' }}>
            <FaArrowLeft size={20} />
          </Link>
        </div>

        <h2 className="text-3xl mb-3 mt-20" style={{ color: 'var(--text-color)' }}>Forgot Password</h2>
        <p className="text-sm mb-6" style={{ color: '#9ca3af' }}>
          Enter your email address and we'll send you a verification code.
        </p>

        <form className="w-[90%]" onSubmit={handleSubmit}>
          <div className="auth-border rounded-full relative p-2 mb-5 w-full" style={{ borderWidth: '1px', borderStyle: 'solid' }}>
            <label
              htmlFor="email"
              className="auth-label absolute text-sm top-[-10px] left-5 px-2"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="johndoe@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input w-full pl-5 pt-1 pr-10 border-none rounded-full focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="auth-btn-primary"
          >
            {submitting ? "Sending..." : "Send Reset Code"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link
            to="/login"
            className="auth-link-muted text-sm"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Forgotpass;
