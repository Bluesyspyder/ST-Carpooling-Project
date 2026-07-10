"use client";

import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/context/AuthContext';
import { ViewModeProvider } from '@/context/ViewModeContext';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import SocketNotificationManager from './SocketNotificationManager';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import { useEffect } from 'react';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideHeaderPaths = ['/landing', '/drive', '/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/check-email'];
  const shouldHideHeader = hideHeaderPaths.some(p => pathname?.includes(p));

  useEffect(() => {
    // Initialize PWA elements for the web (e.g. for Capacitor Camera fallback)
    if (typeof window !== 'undefined') {
      defineCustomElements(window);
    }
  }, []);

  return (
    <AuthProvider>
      <ViewModeProvider>
        <div className="min-h-screen bg-[var(--bg-base)] flex lg:flex-row flex-col">
          {!shouldHideHeader && <Sidebar />}
          <div className="flex-grow flex flex-col min-w-0 pb-16 lg:pb-0"> {/* pb-16 for MobileNav spacing on small screens */}
            {children}
          </div>
          {!shouldHideHeader && <MobileNav />}
          <SocketNotificationManager />
        </div>
      </ViewModeProvider>
    </AuthProvider>
  );
}
