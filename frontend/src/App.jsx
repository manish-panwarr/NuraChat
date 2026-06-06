import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/home/Home";
import Register from "./pages/auth/Register";
import Login from "./pages/auth/Login";
import Verification from "./pages/auth/Verification";
import OAuthSuccess from "./pages/auth/OAuthSuccess";
import ProfilePage from "./pages/profile/ProfilePage";
import SettingsPage from "./pages/settings/SettingsPage";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import { Toaster } from "react-hot-toast";
import CallPage from "./pages/call/CallPage";
import IncomingCallOverlay from "./components/call/IncomingCallOverlay";
import TempModeOverlay from "./components/chat/TempModeOverlay";
import GlobalSocketManager from "./components/call/GlobalSocketManager";
import OngoingCallBanner from "./components/call/OngoingCallBanner";
import useAuthStore from "./store/authStore";
import useCallStore from "./store/callStore";
import { useEffect } from "react";

const AuthLayout = ({ children }) => (
  <div className="flex justify-center items-center min-h-screen bg-neura w-full text-left">
    {children}
  </div>
);

function App() {
  const user = useAuthStore((s) => s.user);
  const restoreAttemptedRef = React.useRef(false);

  useEffect(() => {
    if (!user) return;
    if (restoreAttemptedRef.current) return;
    const savedSession = sessionStorage.getItem("active_call_session");
    const activeRoom = useCallStore.getState().activeRoom;
    if (savedSession && !activeRoom) {
      restoreAttemptedRef.current = true;
      try {
        const session = JSON.parse(savedSession);
        console.log("[App] Restoring call session from storage:", session);

        const restoreSession = async () => {
          try {
            const livekitUrl = import.meta.env.VITE_LIVEKIT_URL;
            const { getLiveKitToken } = await import("./services/livekitService");
            const data = await getLiveKitToken(session.roomName);

            await useCallStore.getState().initCallRoom(
              session.roomName,
              data.token,
              livekitUrl,
              session.type,
              session.peerId,
              session.peerName,
              session.isGroup,
              session.startTime
            );
            console.log("[App] Call session restored successfully.");
          } catch (err) {
            console.error("[App] Failed to restore call session:", err);
            sessionStorage.removeItem("active_call_session");
            useCallStore.getState().resetCallState();
            restoreAttemptedRef.current = false;
          }
        };

        restoreSession();
      } catch (e) {
        console.error("[App] Parsing saved call session failed:", e);
        restoreAttemptedRef.current = false;
      }
    }
  }, [user]);

  return (
    <div className="w-full min-h-screen">
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: "12px",
            background: "var(--card-bg)",
            color: "var(--text-color)",
            border: "1px solid var(--border-color)",
            fontSize: "14px",
          },
        }}
      />
      <Router>
        <GlobalSocketManager />
        <IncomingCallOverlay />
        <TempModeOverlay />
        <OngoingCallBanner />
        <Routes>
          {/* Protected Dashboard Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/call"
            element={
              <ProtectedRoute>
                <CallPage />
              </ProtectedRoute>
            }
          />

          {/* Profile & Settings */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Auth Routes — Centered Card with Gradient Background */}
          <Route
            path="/login/*"
            element={
              <AuthLayout>
                <Login />
              </AuthLayout>
            }
          />
          <Route
            path="/register/*"
            element={
              <AuthLayout>
                <Register />
              </AuthLayout>
            }
          />
          <Route
            path="/verification"
            element={
              <AuthLayout>
                <Verification />
              </AuthLayout>
            }
          />
          <Route
            path="/oauth-success"
            element={
              <AuthLayout>
                <OAuthSuccess />
              </AuthLayout>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
