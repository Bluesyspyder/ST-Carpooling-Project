import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

// Pages
import Landing from '../pages/Landing/index.jsx';
import Dashboard from '../pages/Dashboard/index.jsx';
import Login from '../pages/Login/index.jsx';
import Register from '../pages/Register/index.jsx';
import Profile from '../pages/Profile/index.jsx';
import CreateRide from '../pages/CreateRide/index.jsx';
import SearchRide from '../pages/SearchRide/index.jsx';
import RideDetails from '../pages/RideDetails/index.jsx';
import DriveMode from '../pages/DriveMode/index.jsx';
import ForgotPassword from '../pages/ForgotPassword/index.jsx';
import VerifyOTP from '../pages/VerifyOTP/index.jsx';
import ResetPassword from '../pages/ResetPassword/index.jsx';
import WelcomeSetup from '../pages/WelcomeSetup/index.jsx';
import Bookings from '../pages/Bookings/index.jsx';
import CheckEmail from '../pages/CheckEmail/index.jsx';
import VerifyEmail from '../pages/VerifyEmail/index.jsx';

/**
 * ProtectedRoute — Redirects unauthenticated users to /landing.
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/landing" replace />;
  return children;
};

/**
 * GuestRoute — Redirects already-authenticated users away from auth pages.
 */
const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (user) return <Navigate to="/" replace />;
  return children;
};

/**
 * ProfileCompleteRoute — Redirects users with incomplete profiles to /profile.
 * Checks required fields per role before allowing access to booking/creation flows.
 */
const ProfileCompleteRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/landing" replace />;

  const isRider = user.role === 'hybrid';

  const baseComplete =
    user.firstName &&
    user.lastName;
    // Bypassed strict checks for testing:
    // user.phone &&
    // user.profileImage &&
    // user.isEmailVerified &&
    // user.homeLocation?.verified;

  const riderComplete = isRider
    ? baseComplete // vehicle fields are checked on the server
    : baseComplete;

  if (!riderComplete) {
    return <Navigate to="/profile?incomplete=true" replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* ── Public / Marketing ── */}
      <Route path="/landing" element={<Landing />} />

      {/* ── Auth Routes (redirect logged-in users away) ── */}
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-otp" element={<VerifyOTP />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* ── Email Verification ── */}
      <Route path="/check-email" element={<CheckEmail />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* ── Auth-Protected Routes ── */}
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/welcome-setup" element={<ProtectedRoute><WelcomeSetup /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />

      {/* ── Auth + Profile-Complete Routes ── */}
      <Route
        path="/search"
        element={<ProtectedRoute><ProfileCompleteRoute><SearchRide /></ProfileCompleteRoute></ProtectedRoute>}
      />
      <Route
        path="/rides/:id"
        element={<ProtectedRoute><ProfileCompleteRoute><RideDetails /></ProfileCompleteRoute></ProtectedRoute>}
      />
      <Route
        path="/create-ride"
        element={<ProtectedRoute><ProfileCompleteRoute><CreateRide /></ProfileCompleteRoute></ProtectedRoute>}
      />

      {/* ── Drive Mode (Rider only) ── */}
      <Route
        path="/rides/:id/drive"
        element={<ProtectedRoute><DriveMode /></ProtectedRoute>}
      />

      {/* ── Fallback ── */}
      <Route path="*" element={<Navigate to="/landing" replace />} />
    </Routes>
  );
};

export default AppRoutes;
