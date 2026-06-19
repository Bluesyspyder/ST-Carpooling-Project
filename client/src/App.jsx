import { BrowserRouter, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import AppRoutes from './routes/AppRoutes.jsx';
import { useAuth } from './hooks/useAuth.js';
import useSocket from './hooks/useSocket.js';
import NotificationToast, { useNotifications } from './components/NotificationToast.jsx';

/**
 * Global Header Navigation Component
 */
const Header = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Pages that should not show the header (full-screen drive mode, etc.)
  const hideHeaderPaths = ['/drive'];
  const shouldHideHeader = hideHeaderPaths.some(p => location.pathname.includes(p));
  if (shouldHideHeader) return null;

  const isRider = user?.role === 'hybrid';
  const isLanding = location.pathname === '/landing' || location.pathname === '/';

  const handleLogout = () => {
    logout();
    navigate('/landing');
  };

  return (
    <header className="glass-panel sticky top-0 z-50 px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-800/60">
      {/* Logo */}
      <Link
        to={user ? '/' : '/landing'}
        className="text-xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent tracking-tight"
      >
        ST Carpool
      </Link>

      {/* Nav links */}
      <nav className="flex items-center gap-1 sm:gap-2 text-sm font-semibold">
        {user ? (
          <>
            {/* Dashboard Link */}
            <Link
              to="/"
              className={`px-3 sm:px-4 py-2 rounded-xl transition-all duration-200 ${
                location.pathname === '/'
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                  : 'text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/5 border border-transparent'
              }`}
            >
              Dashboard
            </Link>

            {/* Co-Riders and Riders can search */}
            <Link
              to="/search"
              className={`px-3 sm:px-4 py-2 rounded-xl transition-all duration-200 ${
                location.pathname === '/search'
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                  : 'text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/5 border border-transparent'
              }`}
            >
              Find Ride
            </Link>

            {/* "Offer a Ride" — only for Riders (hybrid) */}
            {isRider && (
              <Link
                to="/create-ride"
                className={`px-3 sm:px-4 py-2 rounded-xl transition-all duration-200 ${
                  location.pathname === '/create-ride'
                    ? 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20'
                    : 'text-slate-300 hover:text-indigo-400 hover:bg-indigo-500/5 border border-transparent'
                }`}
              >
                Offer Ride
              </Link>
            )}

            <Link
              to="/bookings"
              className={`px-3 sm:px-4 py-2 rounded-xl transition-all duration-200 ${
                location.pathname === '/bookings'
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                  : 'text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/5 border border-transparent'
              }`}
            >
              Bookings
            </Link>

            {/* Profile avatar */}
            <Link
              to="/profile"
              className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-slate-700 hover:border-emerald-500/60 overflow-hidden bg-slate-800 transition-all duration-200 ml-1"
              title={`${user.firstName} ${user.lastName}`}
            >
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.firstName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-emerald-400 uppercase">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </span>
              )}
            </Link>

            {/* Role badge (desktop only) */}
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ml-1 transition-all duration-200 cursor-default"
              style={isRider
                ? { background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', borderColor: 'rgba(99,102,241,0.2)' }
                : { background: 'rgba(34,197,94,0.1)', color: '#4ade80', borderColor: 'rgba(34,197,94,0.2)' }
              }
            >
              {isRider ? '🚗 Rider' : '🧑‍💼 Co-Rider'}
            </span>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="px-3 sm:px-4 py-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/5 border border-transparent transition-all duration-200 text-xs"
              title="Sign out"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/5 border border-transparent hover:border-emerald-500/20 transition-all duration-200"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 bg-emerald-400 hover:bg-emerald-500 text-slate-950 rounded-xl transition-all duration-200 font-bold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
            >
              Register
            </Link>
          </>
        )}
      </nav>
    </header>
  );
};

/**
 * SocketNotificationManager — mounts inside AuthProvider so it has access to user/token.
 * Establishes the authenticated socket connection and shows real-time toasts.
 */
const SocketNotificationManager = () => {
  const { user } = useAuth();
  const { notifications, addNotification, dismissNotification } = useNotifications();

  const token = user ? localStorage.getItem('token') : null;

  useSocket(token, {
    'booking:new': (data) =>
      addNotification({ type: 'info', title: 'New Booking Request', message: data.message || `New booking from ${data.passengerName}` }),
    'booking:accepted': (data) =>
      addNotification({ type: 'success', title: 'Booking Accepted!', message: data.message || 'Your booking was confirmed.' }),
    'booking:rejected': (data) =>
      addNotification({ type: 'warning', title: 'Booking Declined', message: data.message || 'Your booking request was declined.' }),
    'booking:cancelled': (data) =>
      addNotification({ type: 'warning', title: 'Booking Cancelled', message: data.message || 'A Co-Rider cancelled their booking.' }),
  });

  return <NotificationToast notifications={notifications} onDismiss={dismissNotification} />;
};

/**
 * Root Client Application Component
 */
const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-slate-950 flex flex-col">
          <Header />
          <div className="flex-grow">
            <AppRoutes />
          </div>
          <SocketNotificationManager />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
