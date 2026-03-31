import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../../config";
import useAuthStore from "../../store/authStore";

export default function OAuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [errorState, setErrorState] = useState(null);
  const login = useAuthStore((s) => s.login);

  useEffect(() => {
    const handleOAuthSuccess = async () => {
      const token = searchParams.get("token");
      const error = searchParams.get("error");

      if (error) {
        setErrorState("OAuth authentication failed. Please try again.");
        return;
      }

      if (!token) {
        setErrorState("No token received. Please try again.");
        return;
      }

      try {
        const res = await axios.get(`${API_URL}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.data?.user) {
          // Persist user and token to Zustand store
          login(res.data.user, token);

          // Check if password needs to be set
          if (!res.data.user.hasPassword) {
            navigate("/home", { state: { setPasswordNeeded: true } });
            return;
          }
          navigate("/home");
        } else {
          setErrorState("Could not retrieve user data. Please try logging in again.");
        }
      } catch (err) {
        console.error("Failed to fetch user:", err);
        setErrorState("Failed to fetch user data: " + (err.response?.data?.message || err.message));
      }
    };

    handleOAuthSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (errorState) {
    return (
      <div className="flex flex-col justify-center items-center h-screen space-y-4 text-center">
        <h2 className="text-2xl font-bold text-red-600">Authentication Error</h2>
        <p className="text-gray-700">{errorState}</p>
        <button onClick={() => navigate("/login")} className="px-6 py-2 mt-4 bg-black text-white rounded-full transition hover:bg-gray-800">
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">
          Completing authentication...
        </h2>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
      </div>
    </div>
  );
}
