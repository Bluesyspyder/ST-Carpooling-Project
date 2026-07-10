"use client";
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export const ViewModeContext = createContext(null);

/**
 * Which "mode" a hybrid user is currently browsing the app in — 'driver' or
 * 'passenger'. Purely a client-side view preference (no backend role change):
 * a hybrid user can already drive AND ride, this just controls which
 * dashboard/nav content and accent color are shown right now.
 * Non-hybrid users are always forced to 'passenger'.
 */
export const ViewModeProvider = ({ children }) => {
  const { user } = useAuth();
  const isHybrid = user?.role === 'hybrid';
  const [viewMode, setViewModeState] = useState('passenger');

  useEffect(() => {
    if (!isHybrid) {
      setViewModeState('passenger');
      return;
    }
    const stored = typeof window !== 'undefined' ? localStorage.getItem('viewMode') : null;
    setViewModeState(stored === 'driver' ? 'driver' : 'passenger');
  }, [isHybrid]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.viewmode = viewMode;
    }
  }, [viewMode]);

  const setViewMode = (mode) => {
    if (!isHybrid) return;
    const next = mode === 'driver' ? 'driver' : 'passenger';
    setViewModeState(next);
    if (typeof window !== 'undefined') localStorage.setItem('viewMode', next);
  };

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode, isHybrid }}>
      {children}
    </ViewModeContext.Provider>
  );
};

export const useViewMode = () => {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
};

export default ViewModeContext;
