import { create } from "zustand";
import { persist } from "zustand/middleware";

const useUiStore = create(
    persist(
        (set) => ({
            theme: "light",
            sidebarTab: "private", // 'public' | 'private'
            showProfilePanel: false,
            isMobileMenuOpen: false,
            isMobileChatOpen: false,

            toggleTheme: () =>
                set((state) => {
                    const next = state.theme === "light" ? "dark" : "light";
                    // Apply to <html> immediately
                    if (next === "dark") {
                        document.documentElement.classList.add("dark");
                    } else {
                        document.documentElement.classList.remove("dark");
                    }
                    return { theme: next };
                }),

            setTheme: (theme) => {
                if (theme === "dark") {
                    document.documentElement.classList.add("dark");
                } else {
                    document.documentElement.classList.remove("dark");
                }
                set({ theme });
            },

            setSidebarTab: (tab) => set({ sidebarTab: tab }),
            toggleProfilePanel: () =>
                set((state) => ({ showProfilePanel: !state.showProfilePanel })),
            setShowProfilePanel: (show) => set({ showProfilePanel: show }),
            setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
            setMobileChatOpen: (open) => set({ isMobileChatOpen: open }),
        }),
        {
            name: "nurachat-ui",
            partialize: (state) => ({ theme: state.theme }),
            onRehydrateStorage: () => (state) => {
                // Apply theme on app load
                if (state?.theme === "dark") {
                    document.documentElement.classList.add("dark");
                } else {
                    document.documentElement.classList.remove("dark");
                }
            },
        }
    )
);

export default useUiStore;
