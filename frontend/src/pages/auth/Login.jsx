import React, { useState } from "react";
import { FaEye, FaEyeSlash, FaGoogle, FaGithub } from "react-icons/fa";
import { Link, Routes, Route, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

import SideImage from "./SideImage";
import Forgot from "./Forgotpass";
import Verify from "./Verification";
import Reset from "./Resetpass";
import SetPass from "./SetPass";
import "../../styles/login.css";

import { OAUTH_URL } from "../../config";

function LoginMain() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return; // Prevent duplicate API calls

    // Frontend validation
    if (!email.trim() || !password.trim()) return;

    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/home");
    } catch (err) {
      const message = err.response?.data?.message;
      if (message === "USER_NOT_FOUND") {
        navigate("/register", { state: { email } });
      } else if (message === "Verify email first") {
        navigate("/register/verification", {
          state: { email, mode: "register" },
        });
      }
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
        <h2 className="text-3xl font-arial mb-4">Log in</h2>

        <p className="text-sm text-gray-500 mb-6">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-black font-medium hover:underline"
          >
            Create an Account
          </Link>
        </p>

        <form className="w-[90%]" onSubmit={handleSubmit}>
          {/* EMAIL */}
          <div className="border border-gray-300 rounded-full relative p-2 mb-5 w-full">
            <label
              htmlFor="email"
              className="absolute text-sm top-[-10px] left-5 bg-white px-2"
            >
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

          {/* PASSWORD */}
          <div className="border border-gray-300 rounded-full relative p-2 w-full mb-4">
            <label
              htmlFor="password"
              className="absolute text-sm top-[-10px] left-5 bg-white px-2"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-5 pt-1 pr-10 border-none rounded-full focus:outline-none"
                required
              />
              <span
                className="absolute right-4 top-2 cursor-pointer text-gray-500"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          <div className="flex justify-end text-sm mb-6">
            <Link
              to="/login/forgot"
              className="text-gray-500 hover:text-black"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-black text-white py-2 rounded-full font-medium hover:bg-gray-800 mb-4 mt-10 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <div className="text-center text-gray-400 mb-6">or</div>

        {/* OAUTH BUTTONS */}
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

export default function Login() {
  return (
    <Routes>
      <Route path="/" element={<LoginMain />} />
      <Route path="forgot" element={<Forgot />} />
      <Route path="forgot/verification" element={<Verify />} />
      <Route path="forgot/verification/resetpass" element={<Reset />} />
      <Route path="setpass" element={<SetPass />} />
    </Routes>
  );
}
