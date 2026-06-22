"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const Header = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isRider = user?.role === 'hybrid';

  const handleLogout = () => {
    logout();
    router.push('/landing');
  };

  return (
    <header className="sticky top-0 z-[9999] px-4 sm:px-6 py-4 flex items-center justify-between bg-[var(--color-transit-bg)] border-b border-[var(--color-transit-border)]">
      {/* Logo */}
      <Link
        href={user ? '/' : '/landing'}
        className="text-xl font-bold font-['Space_Grotesk'] text-[var(--color-transit-accent)] tracking-widest uppercase"
      >
        ST Carpool
      </Link>

      {/* Nav links */}
      <nav className="flex items-center gap-1 sm:gap-2 text-sm font-semibold">
        {user ? (
          <>
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
                pathname === '/'
                  ? 'bg-[var(--color-transit-surface)] text-white border border-[var(--color-transit-border)]'
                  : 'text-[var(--color-transit-muted)] hover:text-white border border-transparent'
              }`}
            >
              Dashboard
            </Link>

            <Link
              href="/search"
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
                pathname === '/search'
                  ? 'bg-[var(--color-transit-surface)] text-white border border-[var(--color-transit-border)]'
                  : 'text-[var(--color-transit-muted)] hover:text-white border border-transparent'
              }`}
            >
              Find Ride
            </Link>

            {isRider && (
              <Link
                href="/create-ride"
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
                  pathname === '/create-ride'
                    ? 'bg-[var(--color-transit-surface)] text-[var(--color-transit-accent)] border border-[var(--color-transit-border)]'
                    : 'text-[var(--color-transit-muted)] hover:text-[var(--color-transit-accent)] border border-transparent'
                }`}
              >
                Offer Ride
              </Link>
            )}

            <Link
              href="/bookings"
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
                pathname === '/bookings'
                  ? 'bg-[var(--color-transit-surface)] text-white border border-[var(--color-transit-border)]'
                  : 'text-[var(--color-transit-muted)] hover:text-white border border-transparent'
              }`}
            >
              Bookings
            </Link>

            <Link
              href="/profile"
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

            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest border ml-2 transition-all duration-200 cursor-default bg-[var(--color-transit-surface)] border-[var(--color-transit-border)] text-[var(--color-transit-text)]">
              {isRider ? 'Rider Mode' : 'Co-Rider'}
            </span>

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
              href="/login"
              className="transit-button-secondary px-4 py-1.5 text-[11px]"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="transit-button-primary px-4 py-1.5 text-[11px]"
            >
              Register
            </Link>
          </>
        )}
      </nav>
    </header>
  );
};

export default Header;
