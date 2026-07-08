"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Route-level auth guard for every page under (protected).
 *
 * This is a static/Capacitor export, so Next middleware does not run for page
 * navigations — protection must happen on the client. Without a token we redirect
 * to /login instead of rendering a protected page with user=null and waiting for
 * some API call to 401. This complements the axios 401 interceptor in services/api.js.
 */
export default function ProtectedLayout({ children }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.replace('/login');
      return;
    }
    setAuthorized(true);
  }, [router]);

  if (!authorized) {
    // Render nothing while we resolve auth to avoid flashing protected content.
    return null;
  }

  return children;
}
