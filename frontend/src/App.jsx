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

// Auth layout with gradient background
const AuthLayout = ({ children }) => (
  <div className="flex justify-center items-center min-h-screen bg-neura w-full text-left">
    {children}
  </div>
);

function App() {
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
