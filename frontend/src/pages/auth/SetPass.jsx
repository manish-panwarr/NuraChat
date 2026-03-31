import React, { useState } from "react";
import { FaArrowLeft, FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate, Link } from "react-router-dom";
import SideImage from "./SideImage";
import { toast } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import "../../styles/login.css";

function validatePassword(password) {
    const errors = [];
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password))
        errors.push("At least one special character");
    if ((password.match(/[a-z]/g) || []).length < 2)
        errors.push("At least two lowercase letters");
    if (!/[A-Z]/.test(password))
        errors.push("At least one uppercase letter");
    if ((password.match(/[0-9]/g) || []).length < 2)
        errors.push("At least two numbers");
    return errors;
}

function SetPass() {
    const navigate = useNavigate();
    const { setPassword: submitSetPassword, isAuthenticated } = useAuth();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (submitting) return;

        if (password !== confirmPassword) {
            toast.error("Passwords do not match!");
            return;
        }

        const errors = validatePassword(password);
        if (errors.length > 0) {
            toast.error("Password must include:\n- " + errors.join("\n- "));
            return;
        }

        if (!isAuthenticated) {
            toast.error("You are not logged in. Please login first.");
            navigate("/login");
            return;
        }

        setSubmitting(true);
        try {
            await submitSetPassword(password);
            toast.success("Password set successfully!");
            navigate("/home");
        } catch (err) {
            // Error managed by useAuth hook
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
                    to="/home"
                    className="absolute top-20 left-5 text-gray-600 hover:text-black transition"
                >
                    <FaArrowLeft size={20} />
                </Link>

                <h2 className="text-3xl mb-3 mt-12">Set Password</h2>
                <p className="text-sm text-gray-600 mb-6">
                    Create a strong password for your account.
                </p>

                <form onSubmit={handleSubmit} className="w-[85%] max-w-md">
                    {/* Password */}
                    <div className="border border-gray-300 rounded-full relative p-2 w-full mb-6">
                        <label className="absolute text-xs -top-2 left-5 bg-white px-2 font-medium">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-5 text-[15px] pr-10 py-1 border-none rounded-full focus:outline-none bg-transparent"
                                required
                                placeholder="Enter your password"
                            />
                            <span
                                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </span>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="border border-gray-300 rounded-full relative p-2 w-full mb-6">
                        <label className="absolute text-xs -top-2 left-5 bg-white px-2 font-medium">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-5 text-[15px] pr-10 py-1 border-none rounded-full focus:outline-none bg-transparent"
                                required
                                placeholder="Confirm your password"
                            />
                            <span
                                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600"
                                onClick={() =>
                                    setShowConfirmPassword(!showConfirmPassword)
                                }
                            >
                                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                            </span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-black text-white font-medium rounded-full px-6 py-2.5 hover:bg-gray-800 disabled:opacity-50 transition"
                    >
                        {submitting ? "Setting Password..." : "Set Password"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default SetPass;
