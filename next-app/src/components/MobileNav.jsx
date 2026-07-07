"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Home, Search, PlusCircle, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const MobileNav = () => {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const isRider = user?.role === 'hybrid';

  const NavItem = ({ href, icon: Icon, label, isActive }) => (
    <Link
      href={href}
      className={cn(
        "relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300",
        isActive ? "text-[var(--primary-base)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      )}
    >
      <Icon className={cn("w-6 h-6", isActive && "text-[var(--primary-base)]")} />
      <span className="text-[10px] font-medium">{label}</span>
      {isActive && (
        <motion.div
          layoutId="mobilenav-active-indicator"
          className="absolute -top-3 w-12 h-1 bg-[var(--primary-base)] rounded-b-full"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
    </Link>
  );

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--bg-base)]/90 backdrop-blur-xl border-t border-[var(--border-subtle)] z-[9999] flex items-center justify-around px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.2)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <NavItem href="/" icon={Home} label="Home" isActive={pathname === '/'} />
      <NavItem href="/search" icon={Search} label="Search" isActive={pathname === '/search'} />
      {isRider && (
        <NavItem href="/create-ride" icon={PlusCircle} label="Offer" isActive={pathname === '/create-ride'} />
      )}
      <NavItem href="/bookings" icon={Calendar} label="Bookings" isActive={pathname === '/bookings'} />
      <NavItem href="/profile" icon={User} label="Profile" isActive={pathname === '/profile'} />
    </nav>
  );
};

export default MobileNav;
