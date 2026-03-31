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

    if (password !== confirmPassword) {
      return;
    }

    if (password.length < 6) {
      return;
    }

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
          className="absolute top-20 left-5 text-gray-600 hover:text-black"
        >
          <FaArrowLeft size={20} />
        </Link>

        <h2 className="text-3xl mb-3">Reset your password</h2>
        <p className="text-sm text-gray-600 mb-6">
          Your new password must be at least 6 characters.
        </p>

        <form onSubmit={handleSubmit} className="w-[75%]">
          <div className="border border-gray-300 rounded-full relative p-2 w-full mb-4">
            <label className="absolute text-sm -top-2 left-5 bg-white px-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-5 pr-10 border-none rounded-full focus:outline-none"
                required
                minLength={6}
              />
              <span
                className="absolute right-4 top-2 cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          <div className="border border-gray-300 rounded-full relative p-2 w-full mb-4">
            <label className="absolute text-sm -top-2 left-5 bg-white px-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-5 pr-10 border-none rounded-full focus:outline-none"
                required
              />
              <span
                className="absolute right-4 top-2 cursor-pointer"
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
            className="w-full border border-gray-300 rounded-full px-6 py-2 hover:bg-black hover:text-white mt-5 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Resetpass;
