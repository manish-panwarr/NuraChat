import { useCallback } from "react";
import useAuthStore from "../store/authStore";
import authService from "../services/authService";
import { toast } from "react-hot-toast";

/**
 * Auth hook wrapping Zustand authStore + authService API calls.
 */
export default function useAuth() {
    const {
        user,
        token,
        isAuthenticated,
        isLoading,
        setLoading,
        login: storeLogin,
        logout: storeLogout,
        setUser,
    } = useAuthStore();

    const login = useCallback(
        async (email, password) => {
            setLoading(true);
            try {
                const res = await authService.login({ email, password });
                storeLogin(res.user, res.token);
                toast.success("Logged in successfully!");
                return res;
            } catch (error) {
                const msg =
                    error.response?.data?.message || "Login failed. Please try again.";
                toast.error(msg);
                throw error;
            } finally {
                setLoading(false);
            }
        },
        [storeLogin, setLoading]
    );

    const register = useCallback(
        async (data) => {
            setLoading(true);
            try {
                const res = await authService.registerInit(data);
                toast.success("OTP sent to your email!");
                return res;
            } catch (error) {
                const msg =
                    error.response?.data?.message ||
                    "Registration failed. Please try again.";
                toast.error(msg);
                throw error;
            } finally {
                setLoading(false);
            }
        },
        [setLoading]
    );

    const verifyOtp = useCallback(
        async (email, otp, type = "register") => {
            setLoading(true);
            try {
                const res = await authService.verifyOtp({ email, otp, type });
                // If registration flow, auto login
                if (type === "register" && res.user && res.token) {
                    storeLogin(res.user, res.token);
                    toast.success("Account created! Welcome aboard!");
                }
                return res;
            } catch (error) {
                const msg =
                    error.response?.data?.message || "OTP verification failed.";
                toast.error(msg);
                throw error;
            } finally {
                setLoading(false);
            }
        },
        [storeLogin, setLoading]
    );

    const forgotPassword = useCallback(
        async (email) => {
            setLoading(true);
            try {
                const res = await authService.sendForgotOtp({ email });
                toast.success("Reset OTP sent to your email!");
                return res;
            } catch (error) {
                const msg =
                    error.response?.data?.message || "Failed to send reset OTP.";
                toast.error(msg);
                throw error;
            } finally {
                setLoading(false);
            }
        },
        [setLoading]
    );

    const resetPassword = useCallback(
        async (email, password) => {
            setLoading(true);
            try {
                const res = await authService.resetPassword({ email, password });
                toast.success("Password reset successfully! Please login.");
                return res;
            } catch (error) {
                const msg =
                    error.response?.data?.message || "Password reset failed.";
                toast.error(msg);
                throw error;
            } finally {
                setLoading(false);
            }
        },
        [setLoading]
    );

    const setPassword = useCallback(
        async (password) => {
            setLoading(true);
            try {
                const res = await authService.setPassword({ password });
                toast.success("Password set successfully!");
                return res;
            } catch (error) {
                const msg =
                    error.response?.data?.message || "Failed to set password.";
                toast.error(msg);
                throw error;
            } finally {
                setLoading(false);
            }
        },
        [setLoading]
    );

    const logout = useCallback(() => {
        storeLogout();
        toast.success("Logged out");
    }, [storeLogout]);

    return {
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        register,
        verifyOtp,
        forgotPassword,
        resetPassword,
        setPassword,
        logout,
        setUser,
    };
}
