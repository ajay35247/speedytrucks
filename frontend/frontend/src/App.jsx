import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoadingSpinner from './components/shared/LoadingSpinner';
import HomePage           from './pages/HomePage';
import LoginPage          from './pages/LoginPage';
import RegisterPage       from './pages/RegisterPage';
import DashboardPage      from './pages/DashboardPage';
import MarketplacePage    from './pages/MarketplacePage';
import KYCPage            from './pages/KYCPage';
import AdminPage          from './pages/AdminPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage  from './pages/ResetPasswordPage';

function PrivateRoute({ children, roles }) {
  const { user, token, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!token)  return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (token)   return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"                element={<HomePage />} />
      <Route path="/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register"        element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/reset-password"  element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
      <Route path="/dashboard"       element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/marketplace"     element={<PrivateRoute><MarketplacePage /></PrivateRoute>} />
      <Route path="/kyc"             element={<PrivateRoute><KYCPage /></PrivateRoute>} />
      <Route path="/admin"           element={<PrivateRoute roles={['admin']}><AdminPage /></PrivateRoute>} />
      <Route path="*"                element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
