import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";

const ProtectedRoute = ({ children }) => {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const user = useAuthStore((s) => s.user);
    const [hasHydrated, setHasHydrated] = useState(false);

    useEffect(() => {
        // Wait for Zustand persist to rehydrate from localStorage
        const unsub = useAuthStore.persist.onFinishHydration(() => {
            setHasHydrated(true);
        });

        // If already hydrated (e.g., navigating between pages), set immediately
        if (useAuthStore.persist.hasHydrated()) {
            setHasHydrated(true);
        }

        return () => {
            if (typeof unsub === "function") unsub();
        };
    }, []);

    // Show nothing while Zustand is rehydrating from localStorage
    if (!hasHydrated) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500"></div>
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
