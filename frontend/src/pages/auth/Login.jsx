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
    if (submitting) return;
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

      <div className="login-right relative bg-white dark:bg-slate-800 flex flex-col justify-center px-10">
        <h2 className="text-3xl font-arial mb-4 text-slate-800 dark:text-slate-100 font-bold">Log in</h2>

        <p className="text-sm mb-6 text-slate-500 dark:text-slate-400">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="auth-link font-medium hover:underline"
          >
            Create an Account
          </Link>
        </p>

        <form className="w-[90%]" onSubmit={handleSubmit}>
          {/* EMAIL */}
          <div className="rounded-full relative p-2 mb-5 w-full border border-slate-200 dark:border-slate-700 focus-within:border-teal-500 dark:focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500 transition-all bg-transparent">
            <label
              htmlFor="email"
              className="absolute text-sm top-[-10px] left-5 px-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="johndoe@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-5 pt-1 pr-10 border-none rounded-full focus:outline-none bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              required
            />
          </div>

          {/* PASSWORD */}
          <div className="rounded-full relative p-2 mb-4 w-full border border-slate-200 dark:border-slate-700 focus-within:border-teal-500 dark:focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500 transition-all bg-transparent">
            <label
              htmlFor="password"
              className="absolute text-sm top-[-10px] left-5 px-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium"
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
                className="w-full pl-5 pt-1 pr-10 border-none rounded-full focus:outline-none bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                required
              />
              <span
                className="absolute right-4 top-2 cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          <div className="flex justify-end text-sm mb-6">
            <Link
              to="/login/forgot"
              className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-teal-500 hover:bg-teal-600 active:scale-95 text-white py-3 rounded-full font-semibold transition-all shadow-sm mt-8 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <div className="text-center text-slate-400 dark:text-slate-500 text-sm mb-6">or</div>

        {/* OAUTH BUTTONS */}
        <div className="flex justify-center gap-4 flex-wrap">
          <a
            href={`${OAUTH_URL}/google`}
            className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-full px-6 py-2.5 bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer text-sm font-medium"
          >
            <FaGoogle className="text-red-400 text-lg" />
            <span className="text-xs">Continue with Google</span>
          </a>

          <a
            href={`${OAUTH_URL}/github`}
            className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-full px-6 py-2.5 bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer text-sm font-medium"
          >
            <FaGithub className="text-lg" />
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
