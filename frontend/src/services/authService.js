import api from "./api";

const authService = {
    login: async ({ email, password }) => {
        const res = await api.post("/auth/login", { email, password });
        return res.data;
    },

    registerInit: async ({ firstName, lastName, email, password }) => {
        const res = await api.post("/auth/register-init", {
            firstName,
            lastName,
            email,
            password,
        });
        return res.data;
    },

    verifyOtp: async ({ email, otp, type }) => {
        const res = await api.post("/auth/verify-otp", { email, otp, type });
        return res.data;
    },

    resendOtp: async ({ email, type }) => {
        const endpoint =
            type === "forgot" ? "/auth/forgot" : "/auth/register-init";
        const res = await api.post(endpoint, { email });
        return res.data;
    },

    sendForgotOtp: async ({ email }) => {
        const res = await api.post("/auth/forgot", { email });
        return res.data;
    },

    resetPassword: async ({ email, password }) => {
        const res = await api.post("/auth/reset-password", { email, password });
        return res.data;
    },

    setPassword: async ({ password }) => {
        const res = await api.post("/auth/set-password", { password });
        return res.data;
    },
};

export default authService;
