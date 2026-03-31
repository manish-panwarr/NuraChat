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
          <Link to="/login">
            <FaArrowLeft size={20} />
          </Link>
        </div>

        <p className="text-sm text-gray-500 mb-5 mt-18 ml-5">
          Already have an account?{" "}
          <Link to="/login" className="text-black font-medium">
            Log in
          </Link>
        </p>

        <form className="w-[90%]" onSubmit={handleSubmit}>
          <div className="flex flex-col md:flex-row gap-4 mb-5">
            <div className="w-full">
              <div className="border border-gray-300 rounded-full relative p-2">
                <label htmlFor="firstName" className="absolute text-sm top-[-10px] left-5 bg-white px-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full pl-5 pt-1 pr-10 border-none rounded-full focus:outline-none"
                  required
                />
              </div>
              {errors.firstName && <p className="text-red-500 text-xs mt-1 ml-4">{errors.firstName}</p>}
            </div>
            <div className="w-full">
              <div className="border border-gray-300 rounded-full relative p-2">
                <label htmlFor="lastName" className="absolute text-sm top-[-10px] left-5 bg-white px-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full pl-5 pt-1 pr-10 border-none rounded-full focus:outline-none"
                  required
                />
              </div>
              {errors.lastName && <p className="text-red-500 text-xs mt-1 ml-4">{errors.lastName}</p>}
            </div>
          </div>

          <div className="mb-5">
            <div className="border border-gray-300 rounded-full relative p-2 w-full">
              <label htmlFor="email" className="absolute text-sm top-[-10px] left-5 bg-white px-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="johndoe@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-5 pt-1 pr-10 border-none rounded-full focus:outline-none"
                required
              />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1 ml-4">{errors.email}</p>}
          </div>

          <div className="mb-4">
            <div className="border border-gray-300 rounded-full relative p-2 w-full">
              <label htmlFor="password" className="absolute text-sm top-[-10px] left-5 bg-white px-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-5 pt-1 pr-10 border-none rounded-full focus:outline-none"
                  required
                />
                <div
                  className="absolute right-4 top-2 cursor-pointer text-gray-500"
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
            <div className="border border-gray-300 rounded-full relative p-2 w-full">
              <label htmlFor="confirmPassword" className="absolute text-sm top-[-10px] left-5 bg-white px-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-5 pt-1 pr-10 border-none rounded-full focus:outline-none"
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
              className="mr-2 accent-black"
            />
            <p>
              I agree to the{" "}
              <a href="#" className="text-black font-medium hover:underline">
                Terms & Conditions
              </a>
            </p>
          </div>
          {errors.agree && <p className="text-red-500 text-xs mb-2 ml-4">{errors.agree}</p>}

          <button
            type="submit"
            disabled={submitting || isLoading}
            className="w-full bg-black text-white py-2 rounded-full font-medium hover:bg-gray-800 mb-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="text-center text-gray-400 mb-2">or</div>

        <div className="flex justify-center gap-4 flex-wrap">
          <a
            href={`${OAUTH_URL}/google`}
            className="flex items-center gap-2 border border-gray-300 rounded-full px-6 py-2 hover:bg-gray-100 transition"
          >
            <FaGoogle className="text-red-400 text-lg" />
            <span className="text-xs">Continue with Google</span>
          </a>
          <a
            href={`${OAUTH_URL}/github`}
            className="flex items-center gap-2 border border-gray-300 rounded-full px-6 py-2 hover:bg-gray-100 transition"
          >
            <FaGithub className="text-black-500 text-lg" />
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
