import React, { useState } from "react";
import { FaArrowLeft, FaEye, FaEyeSlash, FaGoogle, FaGithub } from "react-icons/fa";
import { Link, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

import SideImage from "./SideImage";
import Verification from "./Verification";

import "../../styles/login.css";
import { OAUTH_URL } from "../../config";

function RegisterMain() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, isLoading } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (firstName.trim().length < 2) errs.firstName = "Min 2 characters";
    if (lastName.trim().length < 1) errs.lastName = "Required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Invalid email";
    if (password.length < 6) errs.password = "Min 6 characters";
    if (password !== confirmPassword) errs.confirmPassword = "Passwords don't match";
    if (!agree) errs.agree = "You must agree to terms";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !validate()) return;

    setSubmitting(true);
    try {
      await register({ firstName, lastName, email, password });
      localStorage.setItem("pendingEmail", email);
      navigate("/register/verification", {
        state: { email, mode: "register" },
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
        <SideImage img="/images/login/nurachat-hand.jpg" />
      </div>

      <div className="login-right relative">
        <div className="absolute top-20 left-5">
          <Link to="/login" style={{ color: 'var(--text-color)' }}>
            <FaArrowLeft size={20} />
          </Link>
        </div>

        <p className="text-sm mb-5 mt-18 ml-5" style={{ color: '#9ca3af' }}>
          Already have an account?{" "}
          <Link to="/login" className="auth-link font-medium">
            Log in
          </Link>
        </p>

        <form className="w-[90%]" onSubmit={handleSubmit}>
          <div className="flex flex-col md:flex-row gap-4 mb-5">
            <div className="w-full">
              <div className="auth-border rounded-full relative p-2" style={{ borderWidth: '1px', borderStyle: 'solid' }}>
                <label htmlFor="firstName" className="auth-label absolute text-sm top-[-10px] left-5 px-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="auth-input w-full pl-5 pt-1 pr-10 border-none rounded-full focus:outline-none"
                  required
                />
              </div>
              {errors.firstName && <p className="text-red-500 text-xs mt-1 ml-4">{errors.firstName}</p>}
            </div>
            <div className="w-full">
              <div className="auth-border rounded-full relative p-2" style={{ borderWidth: '1px', borderStyle: 'solid' }}>
                <label htmlFor="lastName" className="auth-label absolute text-sm top-[-10px] left-5 px-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="auth-input w-full pl-5 pt-1 pr-10 border-none rounded-full focus:outline-none"
                  required
                />
              </div>
              {errors.lastName && <p className="text-red-500 text-xs mt-1 ml-4">{errors.lastName}</p>}
            </div>
          </div>

          <div className="mb-5">
            <div className="auth-border rounded-full relative p-2 w-full" style={{ borderWidth: '1px', borderStyle: 'solid' }}>
              <label htmlFor="email" className="auth-label absolute text-sm top-[-10px] left-5 px-2">
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
            {errors.email && <p className="text-red-500 text-xs mt-1 ml-4">{errors.email}</p>}
          </div>

          <div className="mb-4">
            <div className="auth-border rounded-full relative p-2 w-full" style={{ borderWidth: '1px', borderStyle: 'solid' }}>
              <label htmlFor="password" className="auth-label absolute text-sm top-[-10px] left-5 px-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input w-full pl-5 pt-1 pr-10 border-none rounded-full focus:outline-none"
                  required
                />
                <div
                  className="absolute right-4 top-2 cursor-pointer"
                  style={{ color: '#9ca3af' }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </div>
              </div>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1 ml-4">{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div className="mb-4">
            <div className="auth-border rounded-full relative p-2 w-full" style={{ borderWidth: '1px', borderStyle: 'solid' }}>
              <label htmlFor="confirmPassword" className="auth-label absolute text-sm top-[-10px] left-5 px-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="auth-input w-full pl-5 pt-1 pr-10 border-none rounded-full focus:outline-none"
                required
              />
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1 ml-4">{errors.confirmPassword}</p>}
          </div>

          <div className="flex items-center text-sm mb-3">
            <input
              type="checkbox"
              checked={agree}
              onChange={() => setAgree(!agree)}
              className="mr-2 accent-teal-500"
            />
            <p style={{ color: 'var(--text-color)' }}>
              I agree to the{" "}
              <a href="#" className="auth-link font-medium hover:underline">
                Terms & Conditions
              </a>
            </p>
          </div>
          {errors.agree && <p className="text-red-500 text-xs mb-2 ml-4">{errors.agree}</p>}

          <button
            type="submit"
            disabled={submitting || isLoading}
            className="auth-btn-primary mb-2"
          >
            {submitting ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="text-center auth-divider mb-2">or</div>

        <div className="flex justify-center gap-4 flex-wrap">
          <a
            href={`${OAUTH_URL}/google`}
            className="auth-btn-outline"
          >
            <FaGoogle className="text-red-400 text-lg" />
            <span className="text-xs">Continue with Google</span>
          </a>
          <a
            href={`${OAUTH_URL}/github`}
            className="auth-btn-outline"
          >
            <FaGithub className="text-lg" />
            <span className="text-xs">Continue with Github</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Register() {
  return (
    <Routes>
      <Route path="/" element={<RegisterMain />} />
      <Route path="verification" element={<Verification />} />
    </Routes>
  );
}
