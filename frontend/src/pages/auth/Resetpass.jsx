import React, { useState, useEffect } from "react";
import { FaArrowLeft, FaEye, FaEyeSlash } from "react-icons/fa";
import { useLocation, useNavigate, Link } from "react-router-dom";
import SideImage from "./SideImage";
import useAuth from "../../hooks/useAuth";
import "../../styles/login.css";

function Resetpass() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetPassword, isLoading } = useAuth();

  const email = location.state?.email || localStorage.getItem("pendingEmail");
  const mode = location.state?.mode;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!email && mode !== "oauth") {
      navigate("/login/forgot");
    }
  }, [email, mode, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (password !== confirmPassword) return;
    if (password.length < 6) return;

    setSubmitting(true);
    try {
      await resetPassword(email, password);
      navigate("/login");
    } catch {
      // Error handled by useAuth hook
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <SideImage img="/images/login/Nurachat-people.png" />
      </div>

      <div className="login-right relative">
        <Link
          to="/login/forgot/verification"
          className="absolute top-20 left-5"
          style={{ color: 'var(--text-color)' }}
        >
          <FaArrowLeft size={20} />
        </Link>

        <h2 className="text-3xl mb-3" style={{ color: 'var(--text-color)' }}>Reset your password</h2>
        <p className="text-sm mb-6" style={{ color: '#9ca3af' }}>
          Your new password must be at least 6 characters.
        </p>

        <form onSubmit={handleSubmit} className="w-[75%]">
          <div className="auth-border rounded-full relative p-2 w-full mb-4" style={{ borderWidth: '1px', borderStyle: 'solid' }}>
            <label className="auth-label absolute text-sm -top-2 left-5 px-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input w-full pl-5 pr-10 border-none rounded-full focus:outline-none"
                required
                minLength={6}
              />
              <span
                className="absolute right-4 top-2 cursor-pointer"
                style={{ color: '#9ca3af' }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          <div className="auth-border rounded-full relative p-2 w-full mb-4" style={{ borderWidth: '1px', borderStyle: 'solid' }}>
            <label className="auth-label absolute text-sm -top-2 left-5 px-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="auth-input w-full pl-5 pr-10 border-none rounded-full focus:outline-none"
                required
              />
              <span
                className="absolute right-4 top-2 cursor-pointer"
                style={{ color: '#9ca3af' }}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          {password && confirmPassword && password !== confirmPassword && (
            <p className="text-red-500 text-xs mb-3 ml-4">
              Passwords don't match
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || password !== confirmPassword}
            className="auth-btn-primary mt-5"
          >
            {submitting ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Resetpass;
