/**
 * App.jsx — routing + protected route wrapper v3
 * Homepage is public, all features require login
 */
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import AdminPage from "./pages/AdminPage";
import MarketplacePage from "./pages/MarketplacePage";
import KYCPage from "./pages/KYCPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import WalletPage from "./pages/WalletPage";
import PostLoadPage from "./pages/PostLoadPage";
import ProfilePage from "./pages/ProfilePage";
import FreightPage from "./pages/FreightPage";
import ChatPage from "./pages/ChatPage";
import TrackingPage from "./pages/TrackingPage";
import BookingsPage from "./pages/BookingsPage";
import ReferralPage from "./pages/ReferralPage";
import NotificationsPage from "./pages/NotificationsPage";
import AdvertiserPage from "./pages/AdvertiserPage";

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F2F5FC]">
      <div className="w-10 h-10 border-4 border-[#1660F5] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

const P = ({ children, roles }) => <ProtectedRoute roles={roles}>{children}</ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/"                         element={<HomePage />} />
      <Route path="/login"                    element={<LoginPage />} />
      <Route path="/register"                 element={<RegisterPage />} />
      <Route path="/forgot-password"          element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token"    element={<ResetPasswordPage />} />

      {/* Protected routes */}
      <Route path="/dashboard"      element={<P><DashboardPage /></P>} />
      <Route path="/marketplace"    element={<P><MarketplacePage /></P>} />
      <Route path="/freight"        element={<P><FreightPage /></P>} />
      <Route path="/kyc"            element={<P><KYCPage /></P>} />
      <Route path="/wallet"         element={<P><WalletPage /></P>} />
      <Route path="/post-load"      element={<P roles={["shipper"]}><PostLoadPage /></P>} />
      <Route path="/profile"        element={<P><ProfilePage /></P>} />
      <Route path="/chat"           element={<P><ChatPage /></P>} />
      <Route path="/tracking"       element={<P><TrackingPage /></P>} />
      <Route path="/bookings"       element={<P><BookingsPage /></P>} />
      <Route path="/referral"       element={<P><ReferralPage /></P>} />
      <Route path="/notifications"  element={<P><NotificationsPage /></P>} />
      <Route path="/advertiser"     element={<P roles={["advertiser","admin"]}><AdvertiserPage /></P>} />
      <Route path="/admin"          element={<P roles={["admin"]}><AdminPage /></P>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
