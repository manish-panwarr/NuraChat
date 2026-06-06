import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,

            setUser: (user) => set({ user, isAuthenticated: !!user }),

            login: (user, token) => {
                set({ user, token, isAuthenticated: true });
                localStorage.setItem("user", JSON.stringify({ ...user, token }));
            },

            logout: () => {
                set({ user: null, token: null, isAuthenticated: false });
                localStorage.removeItem("user");
            },

            updateUser: (updates) =>
                set((state) => ({
                    user: state.user ? { ...state.user, ...updates } : null,
                })),

            setLoading: (loading) => set({ isLoading: loading }),
        }),
        {
            name: "elio-auth",
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);

export default useAuthStore;
