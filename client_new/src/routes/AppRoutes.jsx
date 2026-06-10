import { Routes, Route, Navigate } from 'react-router-dom';
import Home from '../pages/Home/index.jsx';
import Login from '../pages/Login/index.jsx';
import Register from '../pages/Register/index.jsx';
import Profile from '../pages/Profile/index.jsx';
import CreateRide from '../pages/CreateRide/index.jsx';
import SearchRide from '../pages/SearchRide/index.jsx';
import RideDetails from '../pages/RideDetails/index.jsx';
import ForgotPassword from '../pages/ForgotPassword/index.jsx';
import VerifyOTP from '../pages/VerifyOTP/index.jsx';
import ResetPassword from '../pages/ResetPassword/index.jsx';
import WelcomeSetup from '../pages/WelcomeSetup/index.jsx';
import { useAuth } from '../hooks/useAuth.js';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
      Authenticating...
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Open Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-otp" element={<VerifyOTP />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/search" element={<SearchRide />} />
      <Route path="/rides/:id" element={<RideDetails />} />

      {/* Auth Protected Routes */}
      <Route path="/welcome-setup" element={<ProtectedRoute><WelcomeSetup /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/create-ride" element={<ProtectedRoute><CreateRide /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
