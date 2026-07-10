"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogOut, Home, Search, PlusCircle, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const NavLink = ({ href, icon: Icon, children, isActive }) => (
  <Link
    href={href}
    className={cn(
      "relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 w-full",
      isActive
        ? "text-[var(--primary-base)] bg-[var(--primary-base)]/10"
        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
    )}
  >
    <Icon className={cn("w-5 h-5", isActive ? "text-[var(--primary-base)]" : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]")} />
    <span className="flex-1">{children}</span>
    {isActive && (
      <motion.div
        layoutId="sidebar-active-indicator"
        className="absolute inset-0 border border-[var(--primary-base)]/30 rounded-xl"
        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
      />
    )}
  </Link>
);

const Sidebar = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!user) return null;

  const isRider = user?.role === 'hybrid';

  const handleLogout = () => {
    logout();
    router.push('/landing');
  };



  return (
    <aside className="hidden lg:flex flex-col w-[260px] h-screen sticky top-0 bg-[var(--bg-base)] border-r border-[var(--border-subtle)] overflow-y-auto">
      {/* Branding Header */}
      <div className="p-6 pb-2 border-b border-[var(--border-subtle)]/50">
        <Link href="/" className="flex flex-col gap-4 group mt-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--primary-base)] to-[var(--secondary-base)] flex items-center justify-center shadow-lg shadow-[var(--primary-base)]/20 group-hover:shadow-[var(--primary-base)]/40 transition-all duration-300">
            <span className="text-[var(--text-primary)] font-bold text-2xl">ST</span>
          </div>
          <span className="text-4xl font-extrabold font-['Space_Grotesk'] text-[var(--text-primary)] tracking-tight leading-tight">
            ST Carpool
          </span>
        </Link>
        <div className="mt-4 flex items-center gap-2">
           <span className="flex items-center px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
              {isRider ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary-base)] mr-2 animate-pulse" />
                  Rider
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--secondary-base)] mr-2" />
                  Co-Rider
                </>
              )}
            </span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3 px-2">Main Menu</div>
        <NavLink href="/" icon={Home} isActive={pathname === '/'}>Dashboard</NavLink>
        <NavLink href="/search" icon={Search} isActive={pathname === '/search'}>Find Ride</NavLink>
        {isRider && (
          <NavLink href="/create-ride" icon={PlusCircle} isActive={pathname === '/create-ride'}>Offer Ride</NavLink>
        )}
        <NavLink href="/bookings" icon={Calendar} isActive={pathname === '/bookings'}>Bookings</NavLink>
      </nav>

      {/* Footer Settings & Profile */}
      <div className="p-4 border-t border-[var(--border-subtle)] space-y-4">
        <div className="flex items-center justify-between px-2">
          <span className="text-sm font-medium text-[var(--text-secondary)]">Theme</span>
          <ThemeToggle />
        </div>
        
        <Link
          href="/profile"
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-surface)] transition-colors border border-transparent hover:border-[var(--border-subtle)]"
        >
          <div className="w-10 h-10 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden flex items-center justify-center flex-shrink-0">
             {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.firstName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-[var(--primary-base)] uppercase">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </span>
              )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-[var(--text-secondary)] truncate">View Profile</p>
          </div>
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
