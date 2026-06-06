import { BrowserRouter, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import AppRoutes from './routes/AppRoutes.jsx';
import { useAuth } from './hooks/useAuth.js';

/**
 * Global Header Navigation Component
 */
const Header = () => {
  const { user } = useAuth();
  
  return (
    <header className="glass-panel sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
      <Link to="/" className="text-xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
        Carpool App
      </Link>
      
      <nav className="flex items-center gap-6 text-sm font-semibold">
        <Link to="/search" className="text-slate-300 hover:text-emerald-400 transition">
          Find Ride
        </Link>
        {user ? (
          <>
            <Link to="/create-ride" className="text-slate-300 hover:text-emerald-400 transition">
              Offer Ride
            </Link>
            <Link 
              to="/profile" 
              className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-emerald-500/30 hover:border-emerald-500/60 overflow-hidden bg-emerald-500/10 transition"
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
          </>
        ) : (
          <>
            <Link to="/login" className="text-slate-300 hover:text-emerald-400 transition">
              Sign In
            </Link>
            <Link to="/register" className="px-4 py-2 bg-emerald-400 hover:bg-emerald-500 text-slate-950 rounded-lg transition font-bold">
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
