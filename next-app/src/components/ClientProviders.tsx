"use client";

import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/context/AuthContext';
import Header from './Header';
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
      <div className="min-h-screen bg-slate-950 flex flex-col">
        {!shouldHideHeader && <Header />}
        <div className="flex-grow">
          {children}
        </div>
        <SocketNotificationManager />
      </div>
    </AuthProvider>
  );
}
