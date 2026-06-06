import axios from "axios";

import { API_URL } from "../config";

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true"
    },
});

// Request interceptor attach JWT token
api.interceptors.request.use(
    (config) => {
        const stored = localStorage.getItem("elio-auth");
        if (stored) {
            try {
                const { state } = JSON.parse(stored);
                if (state?.token) {
                    config.headers.Authorization = `Bearer ${state.token}`;
                }
            } catch {
                const user = JSON.parse(localStorage.getItem("user"));
                if (user?.token) {
                    config.headers.Authorization = `Bearer ${user.token}`;
                }
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor — handle 401 globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("elio-auth");
            localStorage.removeItem("user");
            // Only redirect if not already on auth pages
            if (
                !window.location.pathname.includes("/login") &&
                !window.location.pathname.includes("/register")
            ) {
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export { API_URL };
export default api;
