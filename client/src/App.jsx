import { BrowserRouter, Link, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import AppRoutes from './routes/AppRoutes.jsx';
import { useAuth } from './hooks/useAuth.js';

/**
 * Global Header Navigation Component
 */
const Header = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <header className="glass-panel sticky top-0 z-50 px-6 py-5 flex items-center justify-between">
      <Link to="/" className="text-2xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
        Carpool App
      </Link>

      <nav className="flex items-center gap-3 text-base font-semibold">
        {/* Home button — only shown when NOT on the home page */}
        {!isHome && (
          <Link
            to="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-600 hover:border-emerald-500/60 text-slate-200 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </Link>
        )}

        <Link
          to="/search"
          className="px-5 py-2.5 rounded-xl text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/5 border border-transparent hover:border-emerald-500/20 transition-all duration-200"
        >
          Find Ride
        </Link>

        {user ? (
          <>
            <Link
              to="/create-ride"
              className="px-5 py-2.5 rounded-xl text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/5 border border-transparent hover:border-emerald-500/20 transition-all duration-200"
            >
              Offer Ride
            </Link>
            <Link
              to="/profile"
              className="flex items-center justify-center w-11 h-11 rounded-full border-2 border-emerald-500/30 hover:border-emerald-500/60 overflow-hidden bg-emerald-500/10 transition"
            >
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.firstName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-emerald-400 uppercase">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </span>
              )}
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className="px-5 py-2.5 rounded-xl text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/5 border border-transparent hover:border-emerald-500/20 transition-all duration-200"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-5 py-2.5 bg-emerald-400 hover:bg-emerald-500 text-slate-950 rounded-xl transition-all duration-200 font-bold shadow-lg shadow-emerald-500/20"
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
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
