import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaChevronRight } from "react-icons/fa";
import SideImage from "./SideImage";
import axios from "axios";
import "../../styles/login.css";

function Forgot() {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return alert("Please enter your email");

    try {
      setIsSending(true);
      setMessage("");

      const res = await axios.post("http://localhost:5000/api/auth/forgot", { email });
      navigate("/login/forgot/varification", {
        state: { email, mode: "forgot" },
      });


      setMessage(res.data.message || "Verification code sent!");

      setCooldown(30);
      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Navigate to verification page after OTP sent
      navigate("/login/forgot/varification", { state: { email } });

    } catch (err) {
      setMessage(err.response?.data?.message || "Error sending verification code");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <SideImage img={"/images/login/Neurachat.png"} />
      </div>
      <div className="login-right relative">
        <Link to="/login" className="absolute top-20 left-5 text-gray-600 hover:text-black">
          <FaArrowLeft size={20} />
        </Link>

        <h2 className="text-3xl font-arial mb-3">Forgot Password</h2>
        <p className="text-sm text-gray-500 mb-6">We’ll send a verification code to your email address.</p>

        <form className="w-[90%]" onSubmit={handleSubmit}>
          <div className="border border-gray-300 rounded-full relative p-2 mb-5 w-full">
            <label htmlFor="email" className="absolute text-sm top-[-10px] left-5 bg-white px-2">Email Address</label>
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

          <button
            type="submit"
            disabled={isSending || cooldown > 0}
            className={`flex items-center justify-center gap-5 w-full bg-black text-white py-2 rounded-full font-medium mt-10 
              ${isSending || cooldown > 0 ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-800"}`}
          >
            {cooldown > 0 ? `Wait ${cooldown}s` : isSending ? "Sending..." : "Send Verification Code"}
            <FaChevronRight size={15} />
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-green-600">{message}</p>}
      </div>
    </div>
  );
}

export default Forgot;
